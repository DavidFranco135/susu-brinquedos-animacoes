import React, { useState, useEffect } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { User, UserRole } from '../types';

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

// Páginas disponíveis no sistema
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
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({ 
    name: '', 
    email: '', 
    role: UserRole.EMPLOYEE, 
    password: '',
    allowedPages: ['dashboard', 'rentals'] // Páginas padrão para novos colaboradores
  });

  // Carregar staff do localStorage ao iniciar
  useEffect(() => {
    const savedStaff = localStorage.getItem('susu_staff');
    if (savedStaff) {
      try {
        const parsed = JSON.parse(savedStaff);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStaff(parsed);
        }
      } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
      }
    }
  }, []);

  // Salvar staff no localStorage sempre que mudar
  useEffect(() => {
    if (staff.length > 0) {
      localStorage.setItem('susu_staff', JSON.stringify(staff));
    }
  }, [staff]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: '', // Não preenche a senha ao editar
        allowedPages: user.allowedPages || AVAILABLE_PAGES.map(p => p.id)
      });
    } else {
      setEditingUser(null);
      setFormData({ 
        name: '', 
        email: '', 
        role: UserRole.EMPLOYEE, 
        password: '',
        allowedPages: ['dashboard', 'rentals']
      });
    }
    setIsModalOpen(true);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      return alert("Preencha o nome e e-mail");
    }

    if (!editingUser && !formData.password) {
      return alert("A senha é obrigatória para novos usuários");
    }

    if (!editingUser && formData.password && formData.password.length < 6) {
      return alert("A senha deve ter no mínimo 6 caracteres");
    }

    // Verificar se email já existe (exceto ao editar o próprio usuário)
    const emailExists = staff.some(u => 
      u.email.toLowerCase() === formData.email!.toLowerCase() && 
      u.id !== editingUser?.id
    );
    
    if (emailExists) {
      return alert("Este e-mail já está cadastrado");
    }

    if (editingUser) {
      // Editar usuário existente
      setStaff(prev => prev.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: formData.name!,
            email: formData.email!,
            role: formData.role!,
            allowedPages: formData.allowedPages || u.allowedPages,
            // Só atualiza a senha se uma nova foi digitada
            ...(formData.password ? { password: formData.password } : {})
          };
        }
        return u;
      }));
      
      // Se editou o usuário logado, atualizar localStorage
      const currentUser = localStorage.getItem('susu_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.id === editingUser.id) {
          const updatedUser = {
            ...parsed,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            allowedPages: formData.allowedPages
          };
          localStorage.setItem('susu_user', JSON.stringify(updatedUser));
        }
      }
    } else {
      // Criar novo usuário
      const newUser: User = { 
        id: `s${Date.now()}`, 
        name: formData.name!, 
        email: formData.email!.toLowerCase(), 
        password: formData.password!, 
        role: formData.role!,
        allowedPages: formData.allowedPages || AVAILABLE_PAGES.map(p => p.id)
      };
      
      setStaff(prev => [...prev, newUser]);
    }
    
    setIsModalOpen(false);
    setShowPassword(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: UserRole.EMPLOYEE, password: '', allowedPages: ['dashboard', 'rentals'] });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este colaborador? Esta ação não pode ser desfeita.')) {
      setStaff(prev => prev.filter(u => u.id !== id));
      
      // Se deletou o usuário logado, fazer logout
      const currentUser = localStorage.getItem('susu_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.id === id) {
          localStorage.removeItem('susu_user');
          window.location.href = '/login';
        }
      }
    }
  };

  const togglePage = (pageId: string) => {
    const current = formData.allowedPages || [];
    if (current.includes(pageId)) {
      setFormData({...formData, allowedPages: current.filter(p => p !== pageId)});
    } else {
      setFormData({...formData, allowedPages: [...current, pageId]});
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Colaboradores</h1>
          <p className="text-slate-500 font-medium">Gestão de equipe e controle de acessos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={20} strokeWidth={3}/> Novo Acesso
        </button>
      </header>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <tr>
              <th className="px-10 py-5">Colaborador</th>
              <th className="px-8 py-5">Nível de Acesso</th>
              <th className="px-8 py-5">Páginas Permitidas</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-10 py-20 text-center text-slate-400">
                  <UsersRound size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Nenhum colaborador cadastrado</p>
                  <p className="text-xs mt-1">Clique em "Novo Acesso" para adicionar</p>
                </td>
              </tr>
            ) : (
              staff.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                        {u.role === UserRole.ADMIN ? <ShieldCheck size={18}/> : <Shield size={18}/>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase tracking-tight">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                      {u.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {u.role === UserRole.ADMIN ? (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          ✓ Acesso Total
                        </span>
                      ) : (
                        <>
                          {(u.allowedPages || []).slice(0, 3).map(pageId => {
                            const page = AVAILABLE_PAGES.find(p => p.id === pageId);
                            return page ? (
                              <span key={pageId} className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-full">
                                {page.icon} {page.name}
                              </span>
                            ) : null;
                          })}
                          {(u.allowedPages || []).length > 3 && (
                            <span className="text-[10px] font-bold text-slate-400 px-2 py-1">
                              +{(u.allowedPages || []).length - 3}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)} 
                        className="p-3 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"
                        title="Editar"
                      >
                        <Shield size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)} 
                        className="p-3 bg-slate-100 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white w-full max-w-2xl rounded-[40px] p-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                  setShowPassword(false);
                }} 
                className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"
              >
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Login</label>
                <input 
                  required 
                  type="email" 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="usuario@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Senha de Acesso {editingUser && <span className="text-[9px] normal-case">(deixe em branco para não alterar)</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? "••••••••" : "Mínimo 6 caracteres"}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Perfil</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={formData.role} 
                  onChange={e => {
                    const role = e.target.value as UserRole;
                    setFormData({
                      ...formData, 
                      role,
                      // Se for admin, dar acesso a todas as páginas
                      allowedPages: role === UserRole.ADMIN 
                        ? AVAILABLE_PAGES.map(p => p.id) 
                        : formData.allowedPages
                    });
                  }}
                >
                  <option value={UserRole.ADMIN}>👑 Administrador (Acesso Total)</option>
                  <option value={UserRole.EMPLOYEE}>👤 Colaborador (Acesso Personalizado)</option>
                </select>
              </div>

              {formData.role === UserRole.EMPLOYEE && (
                <div className="space-y-3 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    📱 Páginas que o Colaborador Pode Acessar
                  </label>
                  <p className="text-[10px] text-slate-500 font-bold">
                    Selecione quais seções do sistema este usuário poderá visualizar e utilizar
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {AVAILABLE_PAGES.map(page => {
                      const isAllowed = (formData.allowedPages || []).includes(page.id);
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => togglePage(page.id)}
                          className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            isAllowed 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{page.icon}</span>
                            {isAllowed && <Check size={16} className="text-white"/>}
                          </div>
                          <p className={`text-[10px] font-black uppercase tracking-tight ${isAllowed ? 'text-white' : 'text-slate-600'}`}>
                            {page.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  
                  {(formData.allowedPages || []).length === 0 && (
                    <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">
                        ⚠️ Atenção: Selecione pelo menos uma página para o colaborador acessar
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                  setShowPassword(false);
                }} 
                className="flex-1 py-5 text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-50 rounded-3xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-[2] bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                {editingUser ? '💾 Salvar Alterações' : '✨ Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
