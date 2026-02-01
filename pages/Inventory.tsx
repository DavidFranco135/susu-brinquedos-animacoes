import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

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

  const handleAddCategory = () => {
    if (newCatName.trim() && !categories.includes(newCatName.trim())) {
      setCategories([...categories, newCatName.trim()]);
      setNewCatName('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (confirm(`Deseja remover a categoria "${catToRemove}"?`)) {
      setCategories(categories.filter(c => c !== catToRemove));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newToy: Toy = {
      ...(editingToy || {}),
      id: editingToy?.id || `t${Date.now()}`,
      name: formData.name!,
      category: formData.category!,
      price: formData.price!,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&q=80&w=200',
      size: formData.size || '',
      quantity: formData.quantity || 1,
      description: formData.description || '',
      status: formData.status || ToyStatus.AVAILABLE
    } as Toy;

    if (editingToy) {
      setToys(prev => prev.map(t => t.id === editingToy.id ? newToy : t));
    } else {
      setToys(prev => [...prev, newToy]);
    }
    setIsModalOpen(false);
    setEditingToy(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Catálogo</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gestão de Itens e Categorias</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCatModalOpen(true)}
            className="p-4 bg-white border border-slate-100 rounded-3xl text-slate-400 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
            title="Gerenciar Categorias"
          >
            <Settings size={24} />
          </button>
          <button 
            onClick={() => { setEditingToy(null); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> Novo Item
          </button>
        </div>
      </header>

      {/* Modal de Categorias */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Categorias</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Nome da categoria..."
                className="flex-1 px-5 py-3 bg-slate-50 border-0 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button onClick={handleAddCategory} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-all"><Plus size={20}/></button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all">
                  <span className="font-bold text-slate-700">{cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid de Brinquedos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredToys.map(toy => (
          <div key={toy.id} className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="relative h-48 rounded-[24px] overflow-hidden mb-4">
              <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-600">
                {toy.category}
              </div>
            </div>
            <div className="flex justify-between items-start px-2">
              <div>
                <h3 className="font-black text-slate-800 uppercase leading-tight">{toy.name}</h3>
                <p className="text-lg font-black text-blue-600 mt-1">R$ {toy.price}</p>
              </div>
              <button onClick={() => { setEditingToy(toy); setFormData(toy); setIsModalOpen(true); }} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Edit3 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro (abreviado para o código caber) */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-800 uppercase">{editingToy ? 'Editar Item' : 'Novo Item'}</h2>
                    <div className="space-y-4">
                        <input required placeholder="Nome do Item" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                        <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="Preço" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.price} onChange={e=>setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl">Salvar Item</button>
                    <button type="button" onClick={()=>setIsModalOpen(false)} className="w-full text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Inventory;
