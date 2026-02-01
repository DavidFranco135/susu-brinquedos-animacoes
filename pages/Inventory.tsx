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

  const filteredToys = toys.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (toy?: Toy) => {
    if (toy) {
      setEditingToy(toy);
      setFormData(toy);
    } else {
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
    }
    setIsModalOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newToy = {
      ...formData,
      id: editingToy ? editingToy.id : Date.now().toString(),
    } as Toy;

    if (editingToy) {
      setToys(prev => prev.map(t => t.id === editingToy.id ? newToy : t));
    } else {
      setToys(prev => [...prev, newToy]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este brinquedo permanentemente?')) {
      const db = getFirestore();
      await deleteDoc(doc(db, "toys", id));
      setToys(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Estoque de Brinquedos</h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">Gerencie seu catálogo de diversão.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsCatModalOpen(true)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
              <Settings size={20} />
           </button>
           <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none bg-blue-600 text-white px-6 md:px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Novo Produto
           </button>
        </div>
      </header>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou categoria..." 
          className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[30px] shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-600"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        {filteredToys.map(toy => (
          <div key={toy.id} className="bg-white rounded-[40px] border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-2xl transition-all group relative">
            <div className="aspect-square bg-slate-50 rounded-[32px] mb-6 overflow-hidden relative">
              {toy.imageUrl ? (
                <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Plus size={40} />
                </div>
              )}
              <div className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                {toy.category}
              </div>
            </div>
            
            <div className="space-y-1 px-2">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight truncate">{toy.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{toy.size || 'Tam. não inf.'}</p>
                <p className="text-blue-600 font-black">R$ {toy.price.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm rounded-[40px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 z-10">
              <button onClick={() => handleOpenModal(toy)} className="p-4 bg-white text-blue-600 rounded-2xl hover:scale-110 transition-transform shadow-xl">
                <Edit3 size={24} />
              </button>
              {isAdmin && (
                <button onClick={() => handleDelete(toy.id)} className="p-4 bg-white text-red-500 rounded-2xl hover:scale-110 transition-transform shadow-xl">
                  <Trash2 size={24} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                {editingToy ? 'Editar Produto' : 'Novo Brinquedo'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 md:p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-10 overflow-y-auto space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-40 h-40 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden relative group"
                    >
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                            <Upload className="text-slate-300" size={32} />
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Brinquedo</label>
                            <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                        </div>
                        
                        {/* OPÇÃO DE ESCOLHER A CATEGORIA ADICIONADA AQUI */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                            <select 
                              required 
                              className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer" 
                              value={formData.category} 
                              onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                              <option value="" disabled>Selecione uma categoria</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dimensões / Tamanho</label>
                        <input placeholder="Ex: 3m x 3m" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.size} onChange={e=>setFormData({...formData, size: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Qtd. em Estoque</label>
                        <input type="number" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.quantity} onChange={e=>setFormData({...formData, quantity: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor da Locação (R$)</label>
                        <input type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.price} onChange={e=>setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status Inicial</label>
                        <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as ToyStatus})}>
                            {Object.values(ToyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-10 bg-white border-t sticky bottom-0">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95">
                    <Save size={20} className="inline-block mr-2" />
                    {editingToy ? 'Salvar Alterações' : 'Cadastrar Brinquedo'}
                </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Gerenciar Categorias */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Categorias</h2>
               <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400"><X /></button>
            </div>
            <div className="flex gap-2 mb-6">
               <input 
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-xl font-bold border-0 outline-none" 
                  placeholder="Nova categoria..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
               />
               <button 
                  onClick={() => {
                    if (newCatName) {
                      setCategories([...categories, newCatName]);
                      setNewCatName('');
                    }
                  }}
                  className="bg-blue-600 text-white p-3 rounded-xl"
               >
                 <Plus />
               </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
               {categories.map(cat => (
                 <div key={cat} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl font-bold text-slate-600">
                    {cat}
                    <button onClick={() => setCategories(categories.filter(c => c !== cat))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
