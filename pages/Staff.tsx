import React, { useState } from 'react';
import { Trash2, Plus, X, Loader2, ShieldCheck, Shield } from 'lucide-react';
import { User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

const Staff: React.FC<Props> = ({ staff }) => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: UserRole.STAFF });

  const handleDelete = async (id: string) => {
    if (!window.confirm("⚠️ EXCLUIR USUÁRIO?\nOs dados sumirão do banco imediatamente.")) return;
    
    setLoading(true);
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", id));
      // A lista atualiza sozinha via onSnapshot no App.tsx
    } catch (e) {
      alert("Erro ao excluir!");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      const newUser = {
        id: res.user.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        allowedPages: []
      };

      await setDoc(doc(db, "users", res.user.uid), newUser);
      setIsModalOpen(false);
    } catch (e: any) {
      alert("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-black uppercase">Colaboradores</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs">Novo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {staff.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <p className="font-black uppercase text-slate-800">{u.name}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase mt-2">{u.role}</p>
            </div>
            <button onClick={() => handleDelete(u.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreate} className="bg-white p-8 rounded-[40px] w-full max-w-md">
            <h2 className="font-black uppercase mb-6">Novo Colaborador</h2>
            <div className="space-y-4">
              <input placeholder="Nome" className="w-full p-4 bg-slate-50 rounded-2xl" onChange={e=>setFormData({...formData, name: e.target.value})} required />
              <input placeholder="E-mail" type="email" className="w-full p-4 bg-slate-50 rounded-2xl" onChange={e=>setFormData({...formData, email: e.target.value})} required />
              <input placeholder="Senha" type="password" className="w-full p-4 bg-slate-50 rounded-2xl" onChange={e=>setFormData({...formData, password: e.target.value})} required />
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" onChange={e=>setFormData({...formData, role: e.target.value as UserRole})}>
                <option value={UserRole.STAFF}>Colaborador</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase mt-6">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Criar Acesso'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold uppercase text-xs mt-4">Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
