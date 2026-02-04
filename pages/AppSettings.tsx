import React, { useState, useRef, useEffect } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon, History, RotateCcw } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { auth } from '../firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

interface Props {
  company: CompanySettings;
  setCompany: (c: CompanySettings) => void;
  user: User;
  onUpdateUser: (u: User) => void;
}

interface EmailHistoryEntry {
  email: string;
  date: string;
  uid?: string;
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
  
  // ✅ NOVO: Estados para histórico de emails
  const [emailHistory, setEmailHistory] = useState<EmailHistoryEntry[]>([]);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);

  // ✅ NOVO: Carregar histórico de emails ao montar o componente
  useEffect(() => {
    const loadEmailHistory = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        const historyDoc = await getDoc(doc(db, "settings", "adminHistory"));
        if (historyDoc.exists()) {
          const data = historyDoc.data();
          setEmailHistory(data.emails || []);
        }
      } catch (error) {
        console.log("Erro ao carregar histórico:", error);
      }
    };
    
    loadEmailHistory();
  }, []);

  // ✅ NOVO: Função para salvar histórico de email
  const saveEmailToHistory = async (email: string, uid: string) => {
    try {
      const { doc, setDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const historyDoc = await getDoc(doc(db, "settings", "adminHistory"));
      let currentHistory: EmailHistoryEntry[] = [];
      
      if (historyDoc.exists()) {
        currentHistory = historyDoc.data().emails || [];
      }
      
      // Adicionar novo email ao histórico (se não existir)
      const emailExists = currentHistory.some(entry => entry.email === email);
      if (!emailExists) {
        const newEntry: EmailHistoryEntry = {
          email,
          date: new Date().toISOString(),
          uid
        };
        
        currentHistory.unshift(newEntry); // Adiciona no início
        
        // Manter apenas os últimos 10 emails
        if (currentHistory.length > 10) {
          currentHistory = currentHistory.slice(0, 10);
        }
        
        await setDoc(doc(db, "settings", "adminHistory"), { emails: currentHistory });
        setEmailHistory(currentHistory);
      }
    } catch (error) {
      console.log("Erro ao salvar histórico:", error);
    }
  };

  // ✅ NOVO: Função para recuperar email anterior
  const handleRecoverEmail = async (previousEmail: string, previousUid?: string) => {
    if (!confirm(`Deseja recuperar o email anterior?\n\n📧 Email: ${previousEmail}\n\n⚠️ ATENÇÃO:\n- Você precisará definir uma NOVA SENHA\n- Será deslogado automaticamente\n- Faça login com o email recuperado e a nova senha`)) {
      return;
    }

    const newPasswordPrompt = prompt("Digite uma NOVA SENHA para este email (mínimo 6 caracteres):");
    if (!newPasswordPrompt || newPasswordPrompt.length < 6) {
      alert("❌ Senha inválida. Mínimo 6 caracteres.");
      return;
    }

    const currentPasswordPrompt = prompt("Para confirmar, digite sua SENHA ATUAL:");
    if (!currentPasswordPrompt) {
      alert("❌ Senha atual é obrigatória.");
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        alert("❌ Usuário não autenticado.");
        setIsSaving(false);
        return;
      }

      const { setDoc, doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Reautentica
      const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordPrompt);
      await reauthenticateWithCredential(currentUser, credential);

      const oldUid = currentUser.uid;
      const oldEmail = currentUser.email;

      // Salvar email atual no histórico antes de mudar
      await saveEmailToHistory(oldEmail, oldUid);

      // Criar novo usuário com email recuperado
      let newUserCredential;
      try {
        newUserCredential = await createUserWithEmailAndPassword(auth, previousEmail, newPasswordPrompt);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          alert("❌ Este email já está cadastrado.\n\nSe você não consegue acessá-lo, use a opção 'Esqueci minha senha' no login.");
        } else {
          alert("❌ Erro ao criar usuário: " + authError.message);
        }
        setIsSaving(false);
        return;
      }

      const newUid = newUserCredential.user.uid;

      // Criar documento do admin recuperado
      const recoveredAdminData = {
        ...userData,
        id: newUid,
        email: previousEmail
      };

      await setDoc(doc(db, "users", newUid), recoveredAdminData);
      await setDoc(doc(db, "settings", "admin"), { email: previousEmail, uid: newUid });

      // Remover documento antigo
      try {
        await deleteDoc(doc(db, "users", oldUid));
      } catch (deleteError) {
        console.log("Aviso ao remover documento:", deleteError);
      }

      alert(`✅ EMAIL RECUPERADO COM SUCESSO!

📧 Email recuperado: ${previousEmail}
🔐 Nova senha: definida
👑 Permissões: ADMIN

Você será deslogado em 3 segundos.
Faça login com o email recuperado e a nova senha.`);

      setTimeout(async () => {
        await signOut(auth);
      }, 3000);

    } catch (error: any) {
      console.error("Erro ao recuperar email:", error);
      if (error.code === 'auth/wrong-password') {
        alert("❌ Senha atual incorreta.");
      } else {
        alert("❌ Erro: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

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
      
      // 2. Salva os dados do usuário (CORREÇÃO: agora salva a foto de perfil no Firebase)
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

  // ✅ FUNÇÃO CORRIGIDA: Agora CRIA automaticamente o usuário no Firebase Authentication
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

    // ✅ VALIDAÇÃO: Se alterar email, PRECISA fornecer nova senha
    if (newEmail && !newPassword) {
      alert("⚠️ Para alterar o email, você PRECISA definir uma nova senha também.\n\nIsso garante que você conseguirá fazer login com o novo email.");
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

      // Importar setDoc e doc do Firebase
      const { setDoc, doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Reautentica o usuário com a senha atual
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      let successMessage = "";

      // ✅ SE ESTÁ ALTERANDO APENAS A SENHA (sem alterar email)
      if (newPassword && !newEmail) {
        await updatePassword(currentUser, newPassword);
        successMessage = "Senha atualizada com sucesso!";
        
        alert(successMessage);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingCredentials(false);
        setIsSaving(false);
        return;
      }

      // ✅ SE ESTÁ ALTERANDO O EMAIL (FLUXO COMPLETO DE TRANSFERÊNCIA)
      if (newEmail && newEmail !== currentUser.email) {
        console.log("📧 Iniciando transferência de admin para:", newEmail);
        
        const oldUid = currentUser.uid;
        const oldEmail = currentUser.email;

        // ✅ NOVO: Salvar email atual no histórico antes de mudar
        await saveEmailToHistory(oldEmail, oldUid);

        // PASSO 1: Criar NOVO usuário no Firebase Authentication
        let newUserCredential;
        try {
          console.log("🔐 Criando novo usuário no Firebase Authentication...");
          newUserCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
          console.log("✅ Novo usuário criado com UID:", newUserCredential.user.uid);
        } catch (authError: any) {
          console.error("❌ Erro ao criar usuário:", authError);
          if (authError.code === 'auth/email-already-in-use') {
            alert("❌ Este email já está cadastrado no sistema.\n\nUse outro email ou recupere a senha.");
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

        // PASSO 2: Criar documento do novo usuário admin no Firestore
        console.log("📄 Criando documento do novo admin no Firestore...");
        const newAdminData = {
          ...userData,
          id: newUid,
          email: newEmail
        };

        try {
          await setDoc(doc(db, "users", newUid), newAdminData);
          console.log("✅ Documento criado no Firestore");
        } catch (firestoreError: any) {
          console.error("❌ Erro ao criar documento:", firestoreError);
          alert("❌ Erro ao salvar dados no banco: " + firestoreError.message);
          setIsSaving(false);
          return;
        }

        // PASSO 3: Atualizar o email admin nas configurações
        console.log("⚙️ Atualizando configuração de admin...");
        try {
          await setDoc(doc(db, "settings", "admin"), { 
            email: newEmail,
            uid: newUid 
          });
          console.log("✅ Configuração atualizada");
        } catch (settingsError: any) {
          console.log("⚠️ Aviso ao atualizar settings:", settingsError);
        }

        // PASSO 4: Remover documento do usuário antigo (limpeza)
        try {
          console.log("🗑️ Removendo documento antigo...");
          await deleteDoc(doc(db, "users", oldUid));
          console.log("✅ Documento antigo removido");
        } catch (deleteError) {
          console.log("⚠️ Aviso ao remover documento:", deleteError);
        }

        successMessage = `✅ TRANSFERÊNCIA CONCLUÍDA!

📧 Novo email: ${newEmail}
🔐 Nova senha: definida
👑 Você continua como ADMIN

⚠️ IMPORTANTE:
- Você será deslogado em 3 segundos
- Faça login com o NOVO email e senha
- Email antigo salvo no histórico: ${oldEmail}`;

        alert(successMessage);

        // PASSO 5: Deslogar após 3 segundos
        console.log("⏳ Aguardando logout...");
        setTimeout(async () => {
          console.log("👋 Deslogando...");
          await signOut(auth);
        }, 3000);
      }

    } catch (error: any) {
      console.error("Erro ao alterar credenciais:", error);
      
      if (error.code === 'auth/wrong-password') {
        alert("Senha atual incorreta.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("Este email já está em uso por outra conta.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Email inválido.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("Por segurança, faça logout e login novamente antes de alterar o email.");
      } else {
        alert("Erro ao alterar credenciais: " + error.message);
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* DADOS DA EMPRESA */}
          <form onSubmit={handleSubmit}>
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dados da Empresa</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.name}
                  onChange={e => setCompanyData({...companyData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.cnpj || ''}
                  onChange={e => setCompanyData({...companyData, cnpj: e.target.value})}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.phone}
                  onChange={e => setCompanyData({...companyData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.address}
                  onChange={e => setCompanyData({...companyData, address: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Salvando...' : <><Save size={20} /> Salvar Configurações</>}
              </button>
            </div>
          </section>
          </form>

          {/* MEUS DADOS */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meus Dados</h2>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={userData.name}
                      onChange={e => setUserData({...userData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 flex items-center gap-2">
                      <Mail size={16} /> {userData.email}
                    </div>
                  </div>
               </div>
            </div>
          </section>

          {/* ✅ NOVA SEÇÃO: ALTERAR EMAIL E SENHA */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <Lock size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Segurança</h2>
              </div>
              
              <div className="flex gap-2">
                {/* ✅ NOVO: Botão para ver histórico */}
                {emailHistory.length > 0 && (
                  <button
                    onClick={() => setShowEmailHistory(!showEmailHistory)}
                    className="bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-50 hover:text-green-600 transition-all"
                    title="Ver histórico de emails"
                  >
                    <History size={16} className="inline" />
                  </button>
                )}
                
                {!isChangingCredentials && (
                  <button
                    onClick={() => setIsChangingCredentials(true)}
                    className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Key size={16} className="inline mr-2" /> Alterar Email/Senha
                  </button>
                )}
              </div>
            </div>

            {/* ✅ NOVO: Histórico de Emails */}
            {showEmailHistory && emailHistory.length > 0 && (
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-green-900 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} /> Histórico de Emails Admin
                  </h3>
                  <button
                    onClick={() => setShowEmailHistory(false)}
                    className="text-green-600 hover:text-green-800 text-xs font-bold"
                  >
                    ✕ Fechar
                  </button>
                </div>
                
                <p className="text-xs text-green-700 font-bold">
                  Emails anteriores que foram usados como admin. Você pode recuperar qualquer um deles.
                </p>

                <div className="space-y-2">
                  {emailHistory.map((entry, index) => (
                    <div 
                      key={index}
                      className="bg-white p-4 rounded-xl border border-green-200 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">{entry.email}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          Alterado em: {new Date(entry.date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRecoverEmail(entry.email, entry.uid)}
                        disabled={isSaving || entry.email === userData.email}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <RotateCcw size={14} /> Recuperar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha {newEmail ? '*' : '(Opcional)'}</label>
                    <input 
                      type="password" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {newEmail && (
                      <p className="text-[9px] text-red-600 font-bold ml-1">
                        * Obrigatório ao alterar email
                      </p>
                    )}
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
                    🔐 Você continuará como ADMIN mesmo após alterar o email!
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {newEmail 
                      ? "Um novo usuário será criado automaticamente. O email atual será salvo no histórico e poderá ser recuperado depois."
                      : "Após a alteração, faça logout e entre com as novas credenciais."
                    }
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Processando...' : 'Confirmar Alteração'}
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

          {/* NOVO: FOTO DA TELA DE LOGIN */}
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
    </div>
  );
};

export default AppSettings;
import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock, Eye, EyeOff, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'rentals', name: 'Agenda de Eventos', icon: '📅' },
  { id: 'budgets', name: 'Orçamentos', icon: '💼' },
  { id: 'customers', name: 'Clientes', icon: '👥' },
  { id: 'toys', name: 'Brinquedos', icon: '🎪' },
  { id: 'financial', name: 'Financeiro', icon: '💰' },
  { id: 'documents', name: 'Documentos', icon: '📄' },
  { id: 'staff', name: 'Colaboradores', icon: '👨‍💼' },
  { id: 'settings', name: 'Configurações', icon: '⚙️' }
];

const Staff: React.FC<Props> = ({ staff, setStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailConflict, setEmailConflict] = useState(false);
  
  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    name: '',
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    allowedPages: []
  });

  const auth = getAuth();
  const db = getFirestore();

  const handleOpenModal = (user?: User) => {
    setError(null);
    setEmailConflict(false);
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: UserRole.EMPLOYEE, allowedPages: [] });
    }
    setIsModalOpen(true);
  };

  // ✅ FUNÇÃO CORRIGIDA: Remove do Firestore (botão laranja)
  const handleDelete = async (userId: string, userEmail: string) => {
    if (!window.confirm(`⚠️ Remover ${userEmail} da lista?\n\nO email continuará podendo fazer login, mas sem permissões de acesso.`)) {
      return;
    }

    setLoading(true);
    try {
      // 1. Deleta do Firestore
      await deleteDoc(doc(db, "users", userId));
      
      // 2. Atualiza o estado local imediatamente
      setStaff(prev => prev.filter(u => u.id !== userId));
      
      alert("✅ Colaborador removido da lista!");
    } catch (e: any) {
      console.error("Erro ao remover:", e);
      alert("❌ Erro ao remover colaborador: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO NOVA: Deleta completamente (botão vermelho)
  const handleDeleteCompletely = async (userId: string, userEmail: string) => {
    if (!window.confirm(
      `🚨 ATENÇÃO: EXCLUSÃO PERMANENTE\n\n` +
      `Isso vai deletar PERMANENTEMENTE:\n` +
      `✓ ${userEmail}\n` +
      `✓ Acesso ao sistema\n` +
      `✓ Dados do Firestore\n\n` +
      `VOCÊ NÃO PODERÁ DESFAZER!\n\n` +
      `Para deletar do Firebase Auth também, você precisa:\n` +
      `1. Acessar Firebase Console\n` +
      `2. Authentication → Users\n` +
      `3. Deletar o email manualmente\n\n` +
      `Continuar?`
    )) {
      return;
    }

    setLoading(true);
    try {
      // 1. Deleta do Firestore
      console.log("Deletando do Firestore:", userId);
      await deleteDoc(doc(db, "users", userId));
      
      // 2. Atualiza o estado local
      setStaff(prev => prev.filter(u => u.id !== userId));
      
      alert(
        `✅ Usuário removido do Firestore!\n\n` +
        `⚠️ IMPORTANTE:\n` +
        `O email ${userEmail} ainda existe no Firebase Auth.\n\n` +
        `Para deletar completamente:\n` +
        `1. Acesse: https://console.firebase.google.com\n` +
        `2. Vá em Authentication → Users\n` +
        `3. Busque: ${userEmail}\n` +
        `4. Delete manualmente`
      );
    } catch (e: any) {
      console.error("Erro ao deletar:", e);
      alert("❌ Erro ao deletar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO PARA RESTAURAR UM E-MAIL QUE JÁ EXISTE NO AUTH MAS NÃO NO FIRESTORE
  const handleRestoreConflict = async () => {
    setLoading(true);
    setError(null);
    try {
      alert("Para vincular um e-mail já existente, o sistema tentará criar o perfil no banco de dados. Certifique-se que o nome e permissões estão preenchidos.");
      
      const tempId = `old_user_${Date.now()}`;
      const newUser: User = {
        id: tempId,
        name: formData.name || 'Colaborador Recuperado',
        email: formData.email!,
        role: UserRole.EMPLOYEE,
        allowedPages: formData.allowedPages || [],
        profilePhotoUrl: ''
      };

      await setDoc(doc(db, "users", newUser.id), newUser);
      setStaff(prev => [...prev, newUser]);
      setIsModalOpen(false);
      alert("✅ Perfil restaurado! Se o colaborador esqueceu a senha, ele deve usar a opção 'Esqueci minha senha' no login.");
    } catch (e: any) {
      setError("Não foi possível restaurar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailConflict(false);

    try {
      if (editingUser) {
        // Editando usuário existente
        const updatedUser = { ...editingUser, ...formData } as User;
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setIsModalOpen(false);
        alert("✅ Colaborador atualizado!");
      } else {
        // Criando novo usuário
        if (!formData.email || !formData.password) {
          setError("E-mail e senha são obrigatórios.");
          setLoading(false);
          return;
        }

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const newUid = userCredential.user.uid;

          const newUser: User = {
            id: newUid,
            name: formData.name || '',
            email: formData.email,
            role: UserRole.EMPLOYEE,
            allowedPages: formData.allowedPages || [],
            profilePhotoUrl: ''
          };

          await setDoc(doc(db, "users", newUid), newUser);
          setStaff(prev => [...prev, newUser]);
          setIsModalOpen(false);
          alert("✅ Colaborador criado com sucesso!");
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            setEmailConflict(true);
            setError("Este e-mail já está no sistema de login, mas não está na sua lista.");
          } else {
            throw authError;
          }
        }
      }
    } catch (err: any) {
      setError("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (pageId: string) => {
    const currentPages = formData.allowedPages || [];
    setFormData({
      ...formData,
      allowedPages: currentPages.includes(pageId)
        ? currentPages.filter(id => id !== pageId)
        : [...currentPages, pageId]
    });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Colaboradores</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[3px] mt-2">Gestão de Equipe e Permissões</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          disabled={loading}
          className="bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <Plus size={20} /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors overflow-hidden">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UsersRound size={28} />
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenModal(member)} 
                  disabled={loading}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-50"
                  title="Editar permissões"
                >
                  <Shield size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(member.id, member.email)} 
                  disabled={loading}
                  className="p-3 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  title="Remover da lista (mantém no Auth)"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteCompletely(member.id, member.email)} 
                  disabled={loading}
                  className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                  title="DELETAR PERMANENTEMENTE"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{member.name}</h3>
            <p className="text-slate-400 font-bold text-xs mb-6 lowercase">{member.email}</p>
            <div className="flex flex-wrap gap-2">
              {member.allowedPages?.map(pageId => (
                <span key={pageId} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {AVAILABLE_PAGES.find(p => p.id === pageId)?.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 uppercase">{editingUser ? 'Editar Permissões' : 'Novo Colaborador'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>

            {error && (
              <div className={`p-6 rounded-2xl flex flex-col gap-4 ${emailConflict ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 text-red-600'}`}>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={20} /> {error}
                </div>
                {emailConflict && (
                  <button 
                    type="button"
                    onClick={handleRestoreConflict}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={14} /> Reativar Acesso para este E-mail
                  </button>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Nome Completo" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="email" placeholder="E-mail de Login" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingUser} />
              </div>

              {!editingUser && (
                <div className="relative">
                  <input required={!emailConflict} type={showPassword ? "text" : "password"} placeholder="Senha" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-4 text-slate-300">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Páginas Autorizadas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_PAGES.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => togglePage(page.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        formData.allowedPages?.includes(page.id) ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{page.icon}</span>
                        <span className="font-bold text-xs uppercase tracking-tight">{page.name}</span>
                      </div>
                      {formData.allowedPages?.includes(page.id) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20}/> : editingUser ? '💾 Atualizar Colaborador' : '✨ Criar Acesso'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
