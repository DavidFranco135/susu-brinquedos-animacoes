import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc, setDoc, addDoc, collection } from 'firebase/firestore';

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
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [formData, setFormData] = useState<Partial<Toy>>({
    name: '',
    description: '',
    category: categories[0] || 'Geral',
    price: 0,
    status: ToyStatus.AVAILABLE,
    imageUrl: ''
  });

  const handleOpenModal = (toy?: Toy) => {
    if (toy) {
      setEditingToy(toy);
      setFormData(toy);
    } else {
      setEditingToy(null);
      setFormData({
        name: '',
        description: '',
        category: categories[0] || 'Geral',
        price: 0,
        status: ToyStatus.AVAILABLE,
        imageUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSaving(true);
      setUploadProgress('Processando imagem...');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
        setIsSaving(false);
        setUploadProgress('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSaving(true);
    const db = getFirestore();

    try {
      if (editingToy) {
        const toyRef = doc(db, 'toys', editingToy.id);
        await setDoc(toyRef, formData);
      } else {
        const toysCol = collection(db, 'toys');
        await addDoc(toysCol, { ...formData, id: Date.now().toString() });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este brinquedo permanentemente?')) {
      const db = getFirestore();
      await deleteDoc(doc(db, 'toys', id));
    }
  };

  const filteredToys = toys.filter(toy => 
    toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toy.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight uppercase">Estoque</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] md:text-xs tracking-[3px] mt-2">Gerenciamento de Brinquedos</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsCatModalOpen(true)}
            className="bg-white text-slate-600 px-5 md:px-8 py-4 md:py-5 rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3"
          >
            <Settings size={18} /> Categorias
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-slate-900 text-white px-5 md:px-8 py-4 md:py-5 rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl flex items-center gap-3"
          >
            <Plus size={20} /> Novo Item
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Buscar brinquedo ou categoria..." 
          className="w-full pl-16 pr-8 py-5 md:py-6 bg-white rounded-[32px] border-none shadow-sm focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredToys.map((toy) => (
          <div key={toy.id} className="bg-white rounded-[40px] overflow-hidden border border-slate-50 shadow-sm hover:shadow-2xl transition-all group">
            <div className="relative h-64 overflow-hidden">
              {toy.imageUrl ? (
                <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                  <Maximize size={48} />
                </div>
              )}
              <div className="absolute top-6 left-6">
                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                  toy.status === ToyStatus.AVAILABLE ? 'bg-emerald-500 text-white' : 
                  toy.status === ToyStatus.MAINTENANCE ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {toy.status}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[2px]">{toy.category}</span>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-1">{toy.name}</h3>
                  {toy.description && (
                    <p className="text-slate-400 text-xs font-medium mt-1 line-clamp-2">{toy.description}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Diária</span>
                  <span className="text-xl font-black text-slate-800">R$ {toy.price.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(toy)}
                    className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(toy.id)}
                    className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-6 md:p-10 space-y-6 md:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 uppercase">{editingToy ? 'Editar Brinquedo' : 'Novo Brinquedo'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video rounded-[32px] bg-slate-50 border-4 border-dashed border-slate-100 overflow-hidden cursor-pointer group flex items-center justify-center"
                >
                    {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="text-center">
                            <Upload className="mx-auto text-slate-200 mb-2" size={40} />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Upload da Foto</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">
                        Trocar Imagem
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Brinquedo</label>
                        <input 
                          required 
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                          value={formData.name} 
                          onChange={e=>setFormData({...formData, name: e.target.value})} 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                        <textarea 
                          rows={3}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" 
                          value={formData.description || ''} 
                          onChange={e=>setFormData({...formData, description: e.target.value})}
                          placeholder="Ex: Voltagem, dimensões, etc..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                            <select 
                              className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold text-slate-700 outline-none"
                              value={formData.category}
                              onChange={e=>setFormData({...formData, category: e.target.value})}
                            >
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                            <select 
                              className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold text-slate-700 outline-none"
                              value={formData.status}
                              onChange={e=>setFormData({...formData, status: e.target.value as ToyStatus})}
                            >
                                {Object.values(ToyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Locação (R$)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-black text-lg text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                          value={formData.price} 
                          onChange={e=>setFormData({...formData, price: Number(e.target.value)})} 
                        />
                    </div>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
                {isSaving ? (uploadProgress || 'Salvando...') : 'Confirmar Alterações'}
            </button>
          </form>
        </div>
      )}

      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 uppercase">Categorias</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" 
                placeholder="Nova categoria..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button 
                onClick={() => {
                  if (newCatName) {
                    setCategories([...categories, newCatName]);
                    setNewCatName('');
                  }
                }}
                className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-blue-600 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                  <span className="font-bold text-slate-600">{cat}</span>
                  <button 
                    onClick={() => setCategories(categories.filter((_, i) => i !== index))}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
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
