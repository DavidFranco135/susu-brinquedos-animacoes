
import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock } from 'lucide-react';
import { User, UserRole } from '../types';

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

const Staff: React.FC<Props> = ({ staff, setStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ name: '', email: '', role: UserRole.EMPLOYEE, password: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return alert("Preencha todos os campos");
    
    const newUser: User = { 
      id: `s${Date.now()}`, 
      name: formData.name!, 
      email: formData.email!, 
      password: formData.password!, 
      role: formData.role! 
    };
    
    setStaff(prev => [...prev, newUser]);
    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: UserRole.EMPLOYEE, password: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este colaborador?')) setStaff(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Colaboradores</h1><p className="text-slate-500">Gestão de equipe e acessos individuais.</p></div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={20}/> Novo Acesso</button>
      </header>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            <tr><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Nível de Acesso</th><th className="px-6 py-4 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {staff.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{u.name}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                    {u.role === UserRole.ADMIN ? <ShieldCheck size={12}/> : <Shield size={12}/>} {u.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <button onClick={()=>handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white w-full max-w-md rounded-3xl p-8 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Novo Colaborador</h2>
                <button type="button" onClick={()=>setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                    <input required className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail de Login</label>
                    <input required type="email" className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha de Acesso</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                        <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Perfil</label>
                    <select className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value as UserRole})}>
                        <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                        <option value={UserRole.EMPLOYEE}>Colaborador (Acesso Limitado)</option>
                    </select>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">Criar Usuário</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
