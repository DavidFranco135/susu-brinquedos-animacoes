import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon, FileText } from 'lucide-react';
import { CompanySettings, User, UserRole } from '../types';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
// ✅ IMPORTAR AS INSTÂNCIAS CORRETAS DO FIREBASE
import { auth, db } from '../firebase';

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
      // 1. Salva os dados da empresa (incluindo logo, cnpj e fundo de login)
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

  // ✅ FUNÇÃO CORRIGIDA: Alterar Email com transferência COMPLETA de permissões de ADMIN
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔍 Iniciando processo de transferência...");
    
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

    // ✅ VALIDAÇÃO ESPECIAL: Se está alterando email, senha é obrigatória
    if (newEmail && !newPassword) {
      alert("⚠️ Para alterar o email, você PRECISA definir uma nova senha também.\n\nIsso garante que você conseguirá fazer login com o novo email.");
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      
      console.log("👤 Usuário atual:", currentUser?.email);
      console.log("🔧 Auth instance:", auth);
      console.log("🔧 DB instance:", db);
      
      if (!currentUser || !currentUser.email) {
        alert("❌ Usuário não autenticado. Faça login novamente.");
        setIsSaving(false);
        return;
      }

      const oldEmail = currentUser.email;
      const oldUid = currentUser.uid;

      console.log("🔐 Reautenticando usuário...");
      
      // Reautentica o usuário com a senha atual
      try {
        const credential = EmailAuthProvider.credential(oldEmail, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        console.log("✅ Reautenticação bem-sucedida");
      } catch (authError: any) {
        console.error("❌ Erro na reautenticação:", authError);
        if (authError.code === 'auth/wrong-password') {
          alert("❌ Senha atual incorreta.");
        } else if (authError.code === 'auth/too-many-requests') {
          alert("❌ Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        } else {
          alert("❌ Erro ao verificar senha: " + authError.message);
        }
        setIsSaving(false);
        return;
      }

      let successMessage = "";

      // ✅ SE ESTÁ ALTERANDO APENAS A SENHA (sem alterar email)
      if (newPassword && !newEmail) {
        console.log("🔑 Alterando apenas senha...");
        try {
          await updatePassword(currentUser, newPassword);
          successMessage = "✅ Senha atualizada com sucesso!";
          
          alert(successMessage);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsChangingCredentials(false);
          setIsSaving(false);
          return;
        } catch (pwdError: any) {
          console.error("❌ Erro ao alterar senha:", pwdError);
          alert("❌ Erro ao alterar senha: " + pwdError.message);
          setIsSaving(false);
          return;
        }
      }

      // ✅ SE ESTÁ ALTERANDO O EMAIL (com ou sem senha)
      if (newEmail && newEmail !== oldEmail) {
        console.log("📧 Iniciando transferência de ADMIN para novo email:", newEmail);

        // PASSO 1: Cria novo usuário no Firebase Authentication com a nova senha
        let newUserCredential;
        try {
          console.log("📝 Criando novo usuário no Firebase Auth...");
          newUserCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
          console.log("✅ Novo usuário criado no Auth com UID:", newUserCredential.user.uid);
        } catch (authError: any) {
          console.error("❌ Erro ao criar usuário no Auth:", authError);
          if (authError.code === 'auth/email-already-in-use') {
            alert("❌ Este email já está cadastrado no sistema.\n\nUse outro email ou recupere a senha deste email existente.");
          } else if (authError.code === 'auth/invalid-email') {
            alert("❌ Email inválido.");
          } else if (authError.code === 'auth/weak-password') {
            alert("❌ Senha muito fraca. Use no mínimo 6 caracteres.");
          } else {
            alert("❌ Erro ao criar novo usuário: " + authError.message);
          }
          setIsSaving(false);
          return;
        }

        const newUid = newUserCredential.user.uid;

        // PASSO 2: Cria documento do novo admin no Firestore com TODAS as permissões
        console.log("📄 Criando documento admin no Firestore...");
        const newAdminUser: User = {
          id: newUid,
          name: userData.name,
          email: newEmail,
          role: UserRole.ADMIN, // ✅ GARANTE que é ADMIN
          allowedPages: ['dashboard', 'rentals', 'budgets', 'customers', 'toys', 'financial', 'documents', 'staff', 'settings', 'availability'], // ✅ TODAS as páginas
          profilePhotoUrl: userData.profilePhotoUrl || ''
        };

        try {
          await setDoc(doc(db, "users", newUid), newAdminUser);
          console.log("✅ Documento admin criado no Firestore");
        } catch (firestoreError: any) {
          console.error("❌ Erro ao criar documento no Firestore:", firestoreError);
          alert("❌ Erro ao salvar novo admin no banco de dados: " + firestoreError.message);
          setIsSaving(false);
          return;
        }

        // PASSO 3: Atualiza o settings/admin para apontar para o novo email
        console.log("⚙️ Atualizando settings/admin...");
        try {
          await setDoc(doc(db, "settings", "admin"), { 
            email: newEmail,
            uid: newUid 
          });
          console.log("✅ Settings/admin atualizado com sucesso!");
        } catch (settingsError: any) {
          console.error("❌ Erro ao atualizar settings/admin:", settingsError);
          alert("⚠️ Aviso: Novo admin criado, mas houve erro ao atualizar configurações: " + settingsError.message);
          // Continua mesmo com erro
        }

        // PASSO 4: Remove o documento do admin antigo do Firestore
        try {
          console.log("🗑️ Removendo documento do admin antigo...");
          await deleteDoc(doc(db, "users", oldUid));
          console.log("✅ Documento antigo removido");
        } catch (deleteError) {
          console.log("⚠️ Aviso ao remover documento antigo:", deleteError);
          // Não é crítico se falhar
        }

        successMessage = `✅ TRANSFERÊNCIA DE ADMIN CONCLUÍDA!

📧 Novo email admin: ${newEmail}
🔐 Nova senha: definida
👑 Permissões: ADMIN completo
✅ Acesso: todas as páginas

⚠️ IMPORTANTE:
- Você será deslogado automaticamente em 3 segundos
- Faça login com o NOVO EMAIL e NOVA SENHA
- O email antigo (${oldEmail}) não terá mais acesso de admin

🗑️ NOTA: O email antigo ainda existe no Firebase Authentication.
Você pode removê-lo manualmente no console do Firebase se desejar.`;

        alert(successMessage);

        // PASSO 5: Desloga o usuário atual após 3 segundos
        console.log("⏳ Aguardando 3 segundos antes de deslogar...");
        setTimeout(async () => {
          console.log("👋 Deslogando usuário...");
          await signOut(auth);
          console.log("✅ Transferência completa!");
        }, 3000);
      }

    } catch (error: any) {
      console.error("❌ Erro geral na transferência:", error);
      alert("❌ Erro ao processar alteração: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Configurações</h1>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border-2 border-green-500 text-green-700 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest">
            <CheckCircle size={20} />
            Salvo com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* DADOS DA EMPRESA */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-6">
            <h2 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3 text-lg">
              <FileText size={24} className="text-blue-600" />
              Dados da Empresa
            </h2>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Nome da Empresa</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-blue-400 outline-none" 
                value={companyData.name}
                onChange={e => setCompanyData({...companyData, name: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">CNPJ</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-blue-400 outline-none" 
                value={companyData.cnpj || ''}
                onChange={e => setCompanyData({...companyData, cnpj: e.target.value})}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Telefone</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-blue-400 outline-none" 
                value={companyData.phone}
                onChange={e => setCompanyData({...companyData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Endereço</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-blue-400 outline-none" 
                value={companyData.address}
                onChange={e => setCompanyData({...companyData, address: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? '🔄 Salvando...' : <><Save size={20} /> Salvar Configurações</>}
            </button>
          </section>

          {/* MEUS DADOS */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-6">
            <h2 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3 text-lg">
              <UserIcon size={24} className="text-purple-600" />
              Meus Dados
            </h2>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-purple-400 outline-none" 
                value={userData.name}
                onChange={e => setUserData({...userData, name: e.target.value})}
              />
            </div>
          </section>

          {/* ALTERAR EMAIL/SENHA DO ADMIN */}
          <section className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-[48px] border-2 border-red-200 shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3 text-lg">
                  <ShieldCheck size={24} className="text-red-600" />
                  Transferir Administração
                </h2>
                <p className="text-xs font-bold text-red-700 mt-2">
                  ⚠️ Use para transferir o controle total do sistema para outro email
                </p>
              </div>
              {!isChangingCredentials && (
                <button
                  type="button"
                  onClick={() => setIsChangingCredentials(true)}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <Key size={16} />
                  Transferir Admin
                </button>
              )}
            </div>

            {isChangingCredentials ? (
              <form onSubmit={handleChangeCredentials} className="space-y-6 mt-6">
                <div className="p-6 bg-red-100 border-2 border-red-300 rounded-2xl space-y-2">
                  <p className="text-xs font-black text-red-900 uppercase tracking-widest">
                    🚨 ATENÇÃO - TRANSFERÊNCIA DE ADMINISTRAÇÃO
                  </p>
                  <p className="text-xs text-red-800">
                    Esta ação irá transferir TODAS as permissões de administrador para um novo email.
                    Você será deslogado e precisará fazer login com o novo email e senha.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Senha Atual *</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-red-400 outline-none" 
                    value={currentPassword}
                    onChange={e => {
                      console.log("🔑 Senha atual preenchida");
                      setCurrentPassword(e.target.value);
                    }}
                    placeholder="Confirme sua senha atual"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Novo Email Admin *</label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-red-400 outline-none" 
                    value={newEmail}
                    onChange={e => {
                      console.log("📧 Novo email preenchido:", e.target.value);
                      setNewEmail(e.target.value);
                    }}
                    placeholder="novo-admin@email.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Nova Senha do Admin *</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-red-400 outline-none" 
                    value={newPassword}
                    onChange={e => {
                      console.log("🔐 Nova senha preenchida");
                      setNewPassword(e.target.value);
                    }}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-[10px] text-slate-600 font-bold ml-1 mt-1">
                    ⚠️ Obrigatório definir senha para o novo admin
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Confirmar Nova Senha *</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-white rounded-2xl border-2 border-slate-200 font-bold focus:border-red-400 outline-none" 
                    value={confirmPassword}
                    onChange={e => {
                      console.log("✅ Confirmação de senha preenchida");
                      setConfirmPassword(e.target.value);
                    }}
                    placeholder="Digite novamente"
                  />
                </div>

                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-blue-900">
                    ✅ O QUE VAI ACONTECER:
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1 ml-4">
                    <li>• Novo usuário admin será criado no sistema</li>
                    <li>• Todas as permissões serão transferidas</li>
                    <li>• Você será deslogado automaticamente</li>
                    <li>• Faça login com o NOVO email e senha</li>
                    <li>• Seu email atual perderá acesso admin</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? '🔄 Transferindo...' : '✅ Confirmar Transferência'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("❌ Cancelando transferência");
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
              <div className="text-center py-8 bg-white/50 rounded-2xl">
                <p className="text-slate-700 font-bold text-sm">
                  Email atual: <span className="text-slate-900">{userData.email}</span>
                </p>
                <p className="text-slate-400 font-bold text-xs mt-2">
                  Senha: ••••••••
                </p>
                <p className="text-green-600 font-black text-xs mt-4 uppercase tracking-widest">
                  👑 Administrador
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
