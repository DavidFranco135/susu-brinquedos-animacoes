import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { auth } from '../firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

interface Props {
  company: CompanySettings;
  setCompany: (c: CompanySettings) => void;
  user: User;
  onUpdateUser: (u: User) => void;
}

const AppSettings: React.FC<Props> = ({ company, setCompany, user, onUpdateUser }) => {
  const [companyData, setCompanyData] = useState<CompanySettings>(company);
  const [userData, setUserData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estados para alteração de email/senha
  const [isChangingCredentials, setIsChangingCredentials] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);

  const db = getFirestore();

  // Função genérica para processar imagem para Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'profile' | 'login') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'logo') {
          setCompanyData({ ...companyData, logoUrl: base64 });
        } else if (type === 'login') {
          setCompanyData({ ...companyData, loginBgUrl: base64 });
        } else {
          setUserData({ ...userData, profilePhotoUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 1. Salva os dados da empresa (incluindo logo e fundo de login)
      await setCompany(companyData);
      
      // 2. Salva os dados do usuário (agora salva a foto de perfil no Firebase)
      await onUpdateUser(userData);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Alterar Email e Senha com transferência completa de permissões de admin
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword) {
      alert("Por favor, digite sua senha atual para confirmar a alteração.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      alert("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    // Se não tem email nem senha para alterar
    if (!newEmail && !newPassword) {
      alert("Por favor, preencha o novo email e/ou a nova senha.");
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        alert("Usuário não autenticado.");
        setIsSaving(false);
        return;
      }

      const oldEmail = currentUser.email;

      // Reautentica o usuário com a senha atual
      const credential = EmailAuthProvider.credential(oldEmail, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      let successMessage = "";

      // Atualiza a senha primeiro (se fornecida)
      if (newPassword) {
        await updatePassword(currentUser, newPassword);
        successMessage = "Senha atualizada com sucesso!";
      }

      // ✅ ATUALIZA O EMAIL SE FOI FORNECIDO (transferindo permissões de admin)
      if (newEmail && newEmail !== oldEmail) {
        // 1. Atualiza o email no Firebase Authentication
        try {
          await updateEmail(currentUser, newEmail);
        } catch (emailError: any) {
          // Se der erro no Auth, ainda continuamos com as atualizações no Firestore
          console.log("Aviso ao atualizar email no Auth:", emailError);
        }

        // 2. Atualiza o email do admin no settings (CRUCIAL para manter permissões de admin)
        await setDoc(doc(db, "settings", "admin"), { email: newEmail });
        
        // 3. Atualiza o email no documento do usuário atual
        await setDoc(doc(db, "users", currentUser.uid), { 
          ...userData, 
          email: newEmail 
        }, { merge: true });

        // 4. ✅ NOVO: Busca e remove o documento do email antigo (se existir como documento separado)
        // Isso é útil caso o sistema tenha criado um documento com o email antigo como ID
        try {
          const oldEmailDoc = await getDoc(doc(db, "users", oldEmail.replace(/\./g, '_')));
          if (oldEmailDoc.exists()) {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, "users", oldEmail.replace(/\./g, '_')));
          }
        } catch (cleanupError) {
          console.log("Aviso ao limpar documento antigo:", cleanupError);
        }

        successMessage = newPassword 
          ? "✅ Email e senha atualizados! Você continuará como ADMIN. Faça logout e login com o NOVO EMAIL."
          : "✅ Email atualizado! Você continuará como ADMIN. Faça logout e login com o NOVO EMAIL.";
      }

      alert(successMessage || "Alterações salvas com sucesso!");
      
      // Limpa os campos
      setCurrentPassword('');
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingCredentials(false);
      
      // Se alterou email ou senha, faz logout automático
      if (newEmail || newPassword) {
        alert("Fazendo logout para você entrar com as novas credenciais...");
        setTimeout(() => {
          signOut(auth);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("Erro ao alterar credenciais:", error);
      
      if (error.code === 'auth/wrong-password') {
        alert("❌ Senha atual incorreta.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("❌ Este email já está em uso por outra conta.");
      } else if (error.code === 'auth/invalid-email') {
        alert("❌ Email inválido.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("❌ Por segurança, faça logout e login novamente antes de alterar o email.");
      } else {
        alert("❌ Erro ao alterar credenciais: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase mb-2">Configurações</h1>
        <p className="text-slate-400 font-bold uppercase text-xs tracking-[3px]">Personalize seu Sistema</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* DADOS DA EMPRESA */}
            <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Informações da Empresa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social</label>
                  <input required placeholder="Ex: Festa Brinquedos LTDA" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                  <input placeholder="00.000.000/0000-00" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                  <input placeholder="Rua, Número, Bairro, Cidade - UF" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                  <div className="flex items-center gap-2">
                    <Phone size={20} className="text-slate-300 ml-4" />
                    <input placeholder="(00) 00000-0000" className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Contato</label>
                  <div className="flex items-center gap-2">
                    <Mail size={20} className="text-slate-300 ml-4" />
                    <input type="email" placeholder="contato@empresa.com.br" className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50">
                {isSaving ? <><CloudUpload className="animate-bounce" size={20}/> Salvando...</> : showSuccess ? <><CheckCircle size={20}/> Salvo com Sucesso!</> : <><Save size={20}/> Salvar Alterações</>}
              </button>
            </section>

            {/* DADOS DO USUÁRIO */}
            <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <UserIcon size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meu Perfil</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input placeholder="Seu nome" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 flex items-center gap-2">
                      <Mail size={16} /> {userData.email}
                    </div>
                  </div>
               </div>
            </section>

          {/* ✅ SEÇÃO DE SEGURANÇA: ALTERAR EMAIL E SENHA */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <Lock size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Segurança</h2>
              </div>
              
              {!isChangingCredentials && (
                <button
                  type="button"
                  onClick={() => setIsChangingCredentials(true)}
                  className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <Key size={16} className="inline mr-2" /> Alterar Email/Senha
                </button>
              )}
            </div>

            {isChangingCredentials ? (
              <form onSubmit={handleChangeCredentials} className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-xs font-bold text-amber-800">
                    ⚠️ Por segurança, você precisa confirmar sua senha atual para fazer alterações.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Atual *</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Email (Opcional)</label>
                    <input 
                      type="email" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha (Opcional)</label>
                    <input 
                      type="password" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                {newPassword && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      required
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Digite novamente"
                    />
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-xs font-bold text-blue-800">
                    🔐 Suas permissões de ADMIN serão transferidas automaticamente para o novo email!
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Após a alteração, faça logout e entre com as novas credenciais.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Processando...' : '✅ Confirmar Alteração'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingCredentials(false);
                      setCurrentPassword('');
                      setNewEmail('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold text-sm">
                  Email atual: <span className="text-slate-800">{userData.email}</span>
                </p>
                <p className="text-slate-300 font-bold text-xs mt-2">
                  Senha: ••••••••
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* LOGOMARCA */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => logoInputRef.current?.click()} className="relative w-48 h-48 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {companyData.logoUrl ? (
                  <img src={companyData.logoUrl} className="w-full h-full object-cover" />
                ) : (
                  <CloudUpload size={48} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[48px]">
                <Upload size={32} />
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Logomarca</h3>
          </section>

          {/* FOTO DE PERFIL */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => profileInputRef.current?.click()} className="relative w-32 h-32 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-full bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                {userData.profilePhotoUrl ? (
                  <img src={userData.profilePhotoUrl} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-purple-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-full">
                <Upload size={24} />
              </div>
              <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Foto de Perfil</h3>
          </section>

          {/* FOTO DA TELA DE LOGIN */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => loginInputRef.current?.click()} className="relative w-full h-32 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[32px] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {companyData.loginBgUrl ? (
                  <img src={companyData.loginBgUrl} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[32px]">
                <Upload size={24} />
              </div>
              <input type="file" ref={loginInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'login')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Fundo do Login</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Imagem de fundo da tela inicial</p>
          </section>
        </div>
      </div>
      </form>
    </div>
  );
};

export default AppSettings;
