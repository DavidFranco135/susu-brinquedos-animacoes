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
