import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Shield } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../App';
import { User, UserRole } from '../types';

interface Props {
  staff: User[];
}

const Staff: React.FC<Props> = ({ staff }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: UserRole.EMPLOYEE });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

    await setDoc(doc(db, 'users', cred.user.uid), {
      id: cred.user.uid,
      name: form.name,
      email: form.email,
      role: form.role
    });

    setOpen(false);
    setForm({ name: '', email: '', password: '', role: UserRole.EMPLOYEE });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover colaborador?')) return;
    await deleteDoc(doc(db, 'users', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={18}/> Novo
        </button>
      </div>

      <table className="w-full bg-white rounded-xl overflow-hidden">
        <tbody>
          {staff.map(u => (
            <tr key={u.id} className="border-b">
              <td className="p-4">
                <div className="font-bold">{u.name}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </td>
              <td className="p-4">
                {u.role === UserRole.ADMIN
                  ? <ShieldCheck className="text-blue-600" />
                  : <Shield className="text-slate-400" />}
              </td>
              <td className="p-4 text-right">
                <button onClick={() => handleDelete(u.id)} className="text-red-500">
                  <Trash2 />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <form onSubmit={handleAdd} className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl space-y-4 w-full max-w-md">
            <input placeholder="Nome" className="w-full p-3 border rounded-xl" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Email" className="w-full p-3 border rounded-xl" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Senha" type="password" className="w-full p-3 border rounded-xl" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Criar</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Staff;
