import React, { useState } from 'react';
import { Plus, ShieldCheck, Shield, Trash2, X, Lock, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { db } from '../App'; // Certifique-se de que 'db' está exportado no App.tsx ou arquivo de firebase
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface Props {
  staff: User[];
}

const Staff: React.FC<Props> = ({ staff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: UserRole.EMPLOYEE, password: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return alert("Preencha tudo!");

    setLoading(true);
    try {
      // Criamos um ID baseado no timestamp
      const newUserId = `user_${Date.now()}`;
      
      // Salvamos o novo colaborador no Firestore
      // Quando este usuário logar, o App.tsx vai ler este documento e definir a role dele
      await setDoc(doc(db, "users", newUserId), {
        id: newUserId,
        name: formData.name,
        email: formData.email,
        role: formData.role, // Aqui define se é EMPLOYEE ou ADMIN
      });

      alert("Acesso criado! Importante: Crie este mesmo e-mail e senha no menu 'Authentication' do seu Firebase Console para que o login funcione.");
      setIsModalOpen(false);
      setFormData({ name: '', email: '', role: UserRole.EMPLOYEE, password: '' });
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover este acesso?')) {
      try {
        await deleteDoc(doc(db, "users", id));
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Equipe</h1>
          <p className="text-slate-500 text-sm font-medium">Gerencie quem tem acesso ao sistema.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20}/> Novo Colaborador
        </button>
      </header>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="px-8 py-5">Colaborador</th>
              <th className="px-8 py-5">Permissão</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{u.name}</span>
                    <span className="text-xs text-slate-400">{u.email}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    u.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.role === UserRole.ADMIN ? <ShieldCheck size={12}/> : <Shield size={12}/>}
                    {u.role === UserRole.ADMIN ? 'Admin' : 'Colaborador'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  {u.email !== 'admsusu@gmail.com' && (
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18}/>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white w-full max-w-md rounded-[40px] p-10 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">Novo Acesso</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input required className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input required type="email" className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                <input required type="password" placeholder="Mínimo 6 dígitos" className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" 
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                <select className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold appearance-none" 
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.EMPLOYEE}>Colaborador (Acesso Restrito)</option>
                  <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Criar Acesso'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
