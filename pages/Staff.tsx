import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    name: '',
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    allowedPages: []
  });

  const auth = getAuth();
  const db = getFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Atualização de usuário existente
        const updatedUser = { ...editingUser, ...formData } as User;
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } else {
        // CRIAÇÃO DE NOVO USUÁRIO (Autenticação + Banco de Dados)
        if (!formData.email || !formData.password) {
          alert("E-mail e senha são obrigatórios");
          return;
        }

        // 1. Cria o usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const newUid = userCredential.user.uid;

        // 2. Prepara o objeto do usuário para o Firestore
        const newUser: User = {
          id: newUid,
          name: formData.name || '',
          email: formData.email,
          role: formData.role || UserRole.EMPLOYEE,
          allowedPages: formData.allowedPages || [],
          profilePhotoUrl: ''
        };

        // 3. Salva no Firestore
        await setDoc(doc(db, "users", newUid), newUser);
        setStaff(prev => [...prev, newUser]);
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: UserRole.EMPLOYEE, allowedPages: [] });
    } catch (error: any) {
      console.error(error);
      alert("Erro ao criar/editar colaborador: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (pageId: string) => {
    const currentPages = formData.allowedPages || [];
    if (currentPages.includes(pageId)) {
      setFormData({ ...formData, allowedPages: currentPages.filter(id => id !== pageId) });
    } else {
      setFormData({ ...formData, allowedPages: [...currentPages, pageId] });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Colaboradores</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[3px] mt-2">Gestão de Equipe e Permissões</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role: UserRole.EMPLOYEE, allowedPages: [] });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl flex items-center justify-center gap-3"
        >
          <Plus size={20} /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors overflow-hidden">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} className="w-full h-full object-cover" />
                ) : (
                  <UsersRound size={28} />
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingUser(member);
                    setFormData(member);
                    setIsModalOpen(true);
                  }}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  <Shield size={18} />
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

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Nome Completo" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="email" placeholder="E-mail de Login" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingUser} />
              </div>

              {!editingUser && (
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} placeholder="Definir Senha Inicial" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-4 text-slate-300 hover:text-slate-600">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
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

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20}/> : editingUser ? 'Salvar Alterações' : 'Criar e Autorizar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
