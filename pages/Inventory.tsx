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

  const handleOpenModal = (toy?: Toy) => {
    if (!isAdmin) return;
    if (toy) {
      setEditingToy(toy);
      setFormData(toy);
    } else {
      setEditingToy(null);
      const defaultImage = 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&q=80&w=400';
      setFormData({
        name: '',
        category: categories[0] || 'Geral',
        price: 0,
        imageUrl: defaultImage,
        size: '',
        quantity: 1,
        description: '',
        status: ToyStatus.AVAILABLE
      });
    }
    setUploadProgress('');
    setIsModalOpen(true);
  };

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Criar canvas para redimensionar
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Definir tamanho máximo (800x800 pixels)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar imagem redimensionada
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converter para base64 com compressão (qualidade 0.7)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // Verificar tamanho
          const sizeInBytes = (compressedBase64.length * 3) / 4;
          const sizeInKB = sizeInBytes / 1024;
          
          console.log(`Imagem comprimida: ${sizeInKB.toFixed(0)}KB`);
          
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho original (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    try {
      setUploadProgress('Comprimindo imagem...');
      const compressedImage = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: compressedImage }));
      setUploadProgress('');
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      alert('Erro ao processar imagem. Tente outra foto.');
      setUploadProgress('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const db = getFirestore();
      setUploadProgress('Salvando no banco de dados...');

      const toyData: Omit<Toy, 'id'> = {
        name: formData.name || 'Sem Nome',
        category: formData.category || categories[0] || 'Geral',
        price: formData.price || 0,
        imageUrl: formData.imageUrl || '',
        size: formData.size || '',
        quantity: formData.quantity || 1,
        description: formData.description || '',
        status: formData.status as ToyStatus
      };

      if (editingToy) {
        // Editando brinquedo existente
        await setDoc(doc(db, "toys", editingToy.id), toyData);
        
        // Atualizar no estado local
        setToys(prev => prev.map(t => t.id === editingToy.id ? { ...toyData, id: editingToy.id } : t));
      } else {
        // Criando novo brinquedo
        const docRef = await addDoc(collection(db, "toys"), toyData);
        
        // Adicionar ao estado local com o ID gerado
        setToys(prev => [...prev, { ...toyData, id: docRef.id }]);
      }

      setIsModalOpen(false);
      setEditingToy(null);
      setUploadProgress('');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
      setUploadProgress('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteToy = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Deseja realmente excluir este brinquedo?')) return;
    
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "toys", id));
      setToys(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Tente novamente.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !isAdmin) return;
    if (categories.includes(newCatName.trim())) {
      alert('Esta categoria já existe!');
      return;
    }
    
    const newCategories = [...categories, newCatName.trim()];
    setCategories(newCategories);
    
    try {
      const db = getFirestore();
      await setDoc(doc(db, "settings", "categories"), { list: newCategories });
      setNewCatName('');
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
    }
  };

  const handleRemoveCategory = async (catName: string) => {
    if (!isAdmin) return;
    if (!confirm(`Remover a categoria "${catName}"?`)) return;
    
    const newCategories = categories.filter(c => c !== catName);
    setCategories(newCategories);
    
    try {
      const db = getFirestore();
      await setDoc(doc(db, "settings", "categories"), { list: newCategories });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Inventário</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[4px] mt-3">{toys.length} Brinquedos Cadastrados</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {isAdmin && (
            <>
              <button onClick={() => setIsCatModalOpen(true)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm"><Settings size={16}/> Categorias</button>
              <button onClick={() => handleOpenModal()} className="px-8 py-3 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"><Plus size={18}/> Novo Brinquedo</button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
        <input 
          className="w-full pl-14 pr-6 py-5 bg-white rounded-[32px] border border-slate-100 font-bold text-slate-700 placeholder-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
          placeholder="Buscar brinquedos ou categorias..." 
          value={searchTerm} 
          onChange={e=>setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredToys.map(toy => (
          <div key={toy.id} className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-50 hover:shadow-xl transition-all group">
            <div className="h-56 md:h-64 overflow-hidden bg-slate-100 relative">
              <img src={toy.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  toy.status === ToyStatus.AVAILABLE ? 'text-emerald-500' :
                  toy.status === ToyStatus.RENTED ? 'text-amber-500' :
                  'text-red-500'
                }`}>{toy.status}</span>
              </div>
              {toy.size && (
                <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/40 backdrop-blur-sm text-white rounded-2xl">
                  <span className="text-xs font-black uppercase tracking-wide"><Maximize size={14} className="inline mr-1 mb-0.5"/> {toy.size}</span>
                </div>
              )}
            </div>
            
            <div className="p-6 md:p-8 flex flex-col h-auto">
              <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-2 block">{toy.category}</span>
              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-2 leading-tight">{toy.name}</h3>
              
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Diária</span>
                  <p className="text-xl md:text-2xl font-black text-slate-900">R$ {toy.price.toLocaleString('pt-BR')}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(toy)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteToy(toy.id)} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 md:p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-800">Categorias</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="flex gap-2">
              <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Nova categoria..." className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm" />
              <button onClick={handleAddCategory} className="p-3 md:p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors"><Plus size={20}/></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {categories.map(c => (
                <div key={c} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl group">
                  <span className="font-bold text-slate-700 text-sm">{c}</span>
                  <button onClick={() => handleRemoveCategory(c)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
          <form onSubmit={handleSave} className="bg-white w-full max-xl rounded-[40px] p-6 md:p-10 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black text-slate-800">{editingToy ? 'Editar Detalhes' : 'Novo Brinquedo'}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl disabled:opacity-50"><X size={20}/></button>
            </div>
            
            {uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-blue-600">{uploadProgress}</p>
              </div>
            )}
            
            <div className="space-y-6">
                <div className="w-full h-40 md:h-48 rounded-[32px] overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 relative group">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                        <Upload size={48} />
                        <p className="text-xs font-bold">Clique para adicionar foto</p>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={()=>fileInputRef.current?.click()} 
                      disabled={isSaving}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-2 font-black text-xs uppercase tracking-widest disabled:cursor-not-allowed"
                    >
                        <Upload size={24}/> {formData.imageUrl?.startsWith('data:') ? 'Trocar Foto' : 'Adicionar Foto'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      disabled={isSaving}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nome Comercial</label>
                        <input 
                          required 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.name} 
                          onChange={e=>setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
                        <select 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.category} 
                          onChange={e=>setFormData({...formData, category: e.target.value})}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tamanho (ex: 3x3m)</label>
                        <input 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.size} 
                          onChange={e=>setFormData({...formData, size: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Quantidade Total</label>
                        <input 
                          type="number" 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.quantity} 
                          onChange={e=>setFormData({...formData, quantity: Number(e.target.value)})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Status Inicial</label>
                        <select 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.status} 
                          onChange={e=>setFormData({...formData, status: e.target.value as ToyStatus})}
                        >
                            {Object.values(ToyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Descrição do Brinquedo (Opcional)</label>
                    <textarea 
                      disabled={isSaving}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50 resize-none" 
                      value={formData.description || ''} 
                      onChange={e=>setFormData({...formData, description: e.target.value})}
                      placeholder="Adicione detalhes sobre o brinquedo, como características especiais, idade recomendada, etc."
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Valor da Locação (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      disabled={isSaving}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50" 
                      value={formData.price} 
                      onChange={e=>setFormData({...formData, price: Number(e.target.value)})} 
                    />
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving} 
              className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={18} className="inline mr-2" /> {isSaving ? uploadProgress || 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Inventory;
