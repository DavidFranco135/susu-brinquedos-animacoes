import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc, setDoc } from 'firebase/firestore';

interface InventoryProps {
  toys: Toy[];
  setToys: React.Dispatch<React.SetStateAction<Toy[]>>;
  categories: string[];
  setCategories: (cats: string[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ toys, setToys, categories, setCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingToy, setEditingToy] = useState<Toy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = getFirestore();

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [formData, setFormData] = useState<Partial<Toy>>({
    name: '',
    category: categories[0] || 'Geral',
    price: 0,
    imageUrl: '',
    size: '',
    quantity: 1,
    description: '',
    status: ToyStatus.AVAILABLE
  });

  const filteredToys = toys.filter(toy =>
    toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toy.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    const toyData = {
      ...formData,
      id: editingToy?.id || Date.now().toString(),
    } as Toy;

    try {
      await setDoc(doc(db, "toys", toyData.id), toyData);
      setIsModalOpen(false);
      setEditingToy(null);
      setFormData({
        name: '',
        category: categories[0] || 'Geral',
        price: 0,
        imageUrl: '',
        size: '',
        quantity: 1,
        description: '',
        status: ToyStatus.AVAILABLE
      });
    } catch (error) {
      console.error("Erro ao salvar brinquedo:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm('Excluir este item permanentemente?')) return;
    try {
      await deleteDoc(doc(db, "toys", id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">CATÁLOGO DE EQUIPAMENTOS</h1>
          <p className="text-slate-400 font-medium uppercase text-[10px] tracking-widest mt-1">Gestão de Inventário e Disponibilidade</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsCatModalOpen(true)}
              className="bg-white text-slate-600 p-4 rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => { setEditingToy(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> Novo Item
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar no catálogo por nome ou categoria..."
          className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-[24px] shadow-sm text-slate-600 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredToys.map((toy) => (
          <div key={toy.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
            <div className="relative h-56 bg-slate-100 overflow-hidden">
              {toy.imageUrl ? (
                <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs uppercase font-black">Sem foto</div>
              )}
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                  toy.status === ToyStatus.AVAILABLE ? 'bg-emerald-500 text-white' : 
                  toy.status === ToyStatus.MAINTENANCE ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {toy.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{toy.category}</span>
                <h3 className="text-lg font-black text-slate-800 leading-tight mt-1">{toy.name}</h3>
                <div className="flex gap-4 mt-2">
                  {toy.size && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">📏 {toy.size}</p>}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">📦 Qtd: {toy.quantity}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locação</p>
                  <p className="text-xl font-black text-slate-900">R$ {toy.price.toFixed(2)}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingToy(toy); setFormData(toy); setIsModalOpen(true); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(toy.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Configurar Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all"><X /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nome do Equipamento</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
                  <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Dimensões</label>
                  <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" placeholder="ex: 3x3m" value={formData.size} onChange={e=>setFormData({...formData, size: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Estoque</label>
                  <input type="number" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.quantity} onChange={e=>setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Valor</label>
                  <input type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black border-0" value={formData.price} onChange={e=>setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
