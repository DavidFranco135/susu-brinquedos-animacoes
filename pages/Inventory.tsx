import React, { useState, useRef, useMemo } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize, Filter } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name || !formData.category) {
      alert("Por favor, preencha o nome e a categoria.");
      return;
    }

    const toyData: Toy = {
      ...formData,
      id: editingToy?.id || `toy-${Date.now()}`,
      name: formData.name || '',
      category: formData.category || 'Geral',
      price: Number(formData.price) || 0,
      quantity: Number(formData.quantity) || 1,
      status: formData.status || ToyStatus.AVAILABLE,
      imageUrl: formData.imageUrl || ''
    } as Toy;

    // ATUALIZAÇÃO DO ESTADO (Isso fará o App.tsx salvar no Firebase)
    setToys(prev => {
      if (editingToy) {
        return prev.map(t => t.id === editingToy.id ? toyData : t);
      }
      return [toyData, ...prev];
    });

    setIsModalOpen(false);
    setEditingToy(null);
  };

  const handleDeleteToy = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      setToys(prev => prev.filter(t => t.id !== id));
      // A exclusão no Firestore é gerenciada pelo useEffect no App.tsx que monitora o setToys
    } catch (error) {
      alert("Erro ao excluir item.");
    }
  };

  const filteredToys = toys.filter(toy =>
    toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toy.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Catálogo de Brinquedos</h1>
          <p className="text-slate-500 font-medium">Gerencie seu inventário e animações.</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <>
              <button onClick={() => setIsCatModalOpen(true)} className="p-4 bg-slate-100 text-slate-600 rounded-3xl hover:bg-slate-200 transition-all">
                <Settings size={20} />
              </button>
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                <Plus size={20} /> Novo Item
              </button>
            </>
          )}
        </div>
      </header>

      {/* Busca */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar no catálogo (nome ou categoria)..."
          className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[30px] font-bold text-slate-700 outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredToys.map(toy => (
          <div key={toy.id} className="bg-white rounded-[35px] border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
            <div className="aspect-square rounded-[25px] bg-slate-50 mb-4 overflow-hidden relative">
              {toy.imageUrl ? (
                <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Maximize size={40} />
                </div>
              )}
              <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur shadow-sm rounded-full text-[10px] font-black uppercase text-slate-600">
                {toy.category}
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-slate-800 text-lg leading-tight truncate">{toy.name}</h3>
              <p className="text-blue-600 font-black">R$ {toy.price.toLocaleString('pt-BR')}</p>
            </div>

            {isAdmin && (
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(toy)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <Edit3 size={14} /> Editar
                </button>
                <button onClick={() => handleDeleteToy(toy.id)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingToy ? 'Editar Item' : 'Novo Brinquedo'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-all"><X size={24}/></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Brinquedo / Animação</label>
                <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="Ex: Cama Elástica G" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                  <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Locação</label>
                  <input type="number" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none" value={formData.price} onChange={e=>setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">URL da Imagem</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none" value={formData.imageUrl} onChange={e=>setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              <Save size={20} /> {editingToy ? 'Salvar Alterações' : 'Cadastrar no Catálogo'}
            </button>
          </form>
        </div>
      )}

      {/* Modal de Categorias */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl space-y-6">
            <h2 className="text-2xl font-black text-slate-800">Gerenciar Categorias</h2>
            <div className="flex gap-2">
              <input className="flex-1 px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500/20" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nova categoria..." />
              <button onClick={() => {
                if (newCatName && !categories.includes(newCatName)) {
                  setCategories([...categories, newCatName]);
                  setNewCatName('');
                }
              }} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"><Plus size={20}/></button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-700">{cat}</span>
                  {cat !== 'Geral' && (
                    <button onClick={() => setCategories(categories.filter(c => c !== cat))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setIsCatModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
