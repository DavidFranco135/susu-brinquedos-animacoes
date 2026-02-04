import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock, Eye, EyeOff, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

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

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    password: '',
    role: UserRole.STAFF,
    allowedPages: ['rentals', 'customers']
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: UserRole.STAFF,
      allowedPages: ['rentals', 'customers']
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('🚨 Tem certeza que deseja remover este acesso?\n\nIsso removerá os dados do colaborador. Para impedir o login definitivamente, remova também o e-mail no console do Firebase Authentication.')) {
      setLoading(true);
      try {
        const db = getFirestore();
        // Deleta o documento no Firestore
        await deleteDoc(doc(db, "users", id));
        // O App.tsx atualizará a lista automaticamente via onSnapshot
      } catch (error: any) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao remover: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const db = getFirestore();

    try {
      if (editingUser) {
        // Atualizar usuário existente
        await setDoc(doc(db, "users", editingUser.id), formData);
        setIsModalOpen(false);
        resetForm();
      } else {
        // Criar novo usuário no Auth e Firestore
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email!, formData.password!);
        const newUser = {
          ...formData,
          id: userCredential.user.uid,
          password: '' // Não salvar senha no Firestore por segurança
        };
        await setDoc(doc(db, "users", userCredential.user.uid), newUser);
        setIsModalOpen(false);
        resetForm();
      }
    } catch (error: any) {
      alert("Erro na operação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (pageId: string) => {
    const current = formData.allowedPages || [];
    const updated = current.includes(pageId)
      ? current.filter(id => id !== pageId)
      : [...current, pageId];
    setFormData({ ...formData, allowedPages: updated });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <UsersRound className="text-blue-600" size={32} />
            Colaboradores
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-11">Gestão de Acessos</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Novo Acesso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((u) => (
          <div key={u.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${u.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                {u.role === UserRole.ADMIN ? <ShieldCheck size={28} /> : <Shield size={28} />}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(u)} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors">
                  <RefreshCw size={18} />
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{u.name}</h3>
              <p className="text-slate-400 font-medium text-sm">{u.email}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full ${u.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                {u.role}
              </span>
              <div className="flex -space-x-2">
                {u.allowedPages?.slice(0, 3).map(p => (
                  <div key={p} className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-xs" title={p}>
                    {AVAILABLE_PAGES.find(ap => ap.id === p)?.icon}
                  </div>
                ))}
                {(u.allowedPages?.length || 0) > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                    +{(u.allowedPages?.length || 0) - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[48px] p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors">
              <X size={32} />
            </button>

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Defina o nível de acesso e permissões</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nome Completo</label>
                  <input
                    required
                    className="w-full px-8 py-5 bg-slate-50 rounded-3xl border-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">E-mail de Acesso</label>
                  <input
                    required
                    type="email"
                    disabled={!!editingUser}
                    className="w-full px-8 py-5 bg-slate-50 rounded-3xl border-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all outline-none disabled:opacity-50"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Senha Provisória</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-8 py-5 bg-slate-50 rounded-3xl border-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all outline-none"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nível de Poder</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: UserRole.STAFF})}
                    className={`p-6 rounded-3xl border-2 transition-all text-left ${formData.role === UserRole.STAFF ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 bg-slate-50'}`}
                  >
                    <Shield size={24} className={formData.role === UserRole.STAFF ? 'text-blue-600' : 'text-slate-300'} />
                    <div className="mt-3">
                      <p className={`font-black text-xs uppercase ${formData.role === UserRole.STAFF ? 'text-blue-600' : 'text-slate-400'}`}>Colaborador</p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Acesso restrito a páginas selecionadas</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: UserRole.ADMIN})}
                    className={`p-6 rounded-3xl border-2 transition-all text-left ${formData.role === UserRole.ADMIN ? 'border-amber-500 bg-amber-50/50' : 'border-slate-50 bg-slate-50'}`}
                  >
                    <ShieldCheck size={24} className={formData.role === UserRole.ADMIN ? 'text-amber-500' : 'text-slate-300'} />
                    <div className="mt-3">
                      <p className={`font-black text-xs uppercase ${formData.role === UserRole.ADMIN ? 'text-amber-600' : 'text-slate-400'}`}>Administrador</p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Acesso total a todas as funções</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className={`space-y-4 transition-all ${formData.role === UserRole.ADMIN ? 'opacity-30 pointer-events-none' : ''}`}>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Permissões de Acesso</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white mt-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20}/> : editingUser ? '💾 Atualizar Colaborador' : '✨ Criar Acesso'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
