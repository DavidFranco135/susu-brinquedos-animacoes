import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
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
      setPreviewUrl(toy.imageUrl);
      setSelectedImage(null);
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
      setPreviewUrl(defaultImage);
      setSelectedImage(null);
    }
    setUploadProgress('');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB');
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida');
        return;
      }

      setSelectedImage(file);
      
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToStorage = async (file: File, toyId: string): Promise<string> => {
    const storage = getStorage();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `toys/${toyId}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    setUploadProgress('Enviando imagem...');
    await uploadBytes(storageRef, file);
    
    setUploadProgress('Obtendo URL...');
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const db = getFirestore();
      
      // Gerar ID temporário para novo brinquedo
      const tempId = editingToy?.id || `toy_${Date.now()}`;
      
      // Upload da imagem se uma nova foi selecionada
      let imageUrl = formData.imageUrl || '';
      if (selectedImage) {
        imageUrl = await uploadImageToStorage(selectedImage, tempId);
      }

      setUploadProgress('Salvando dados...');

      const toyData: Omit<Toy, 'id'> = {
        name: formData.name || 'Sem Nome',
        category: formData.category || categories[0] || 'Geral',
        price: formData.price || 0,
        imageUrl: imageUrl,
        size: formData.size || '',
        quantity: formData.quantity || 1,
        description: formData.description,
        status: formData.status as ToyStatus
      };

      if (editingToy) {
        // Editando brinquedo existente
        await setDoc(doc(db, "toys", editingToy.id), toyData);
        setToys(prev => prev.map(t => t.id === editingToy.id ? { ...toyData, id: editingToy.id } : t));
      } else {
        // Adicionando novo brinquedo
        const docRef = await addDoc(collection(db, "toys"), toyData);
        const newToy: Toy = { ...toyData, id: docRef.id };
        setToys(prev => [...prev, newToy]);
      }
      
      setUploadProgress('');
      setIsModalOpen(false);
      setEditingToy(null);
      setSelectedImage(null);
      setPreviewUrl('');
    } catch (error) {
      console.error("Erro ao salvar brinquedo:", error);
      setUploadProgress('');
      alert(`Erro ao salvar brinquedo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteToy = async (id: string) => {
    if (!confirm("Remover este brinquedo do catálogo permanentemente?")) return;
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "toys", id));
      setToys(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir.");
    }
  };

  const handleAddCategory = () => {
    if (newCatName && !categories.includes(newCatName)) {
      setCategories([...categories, newCatName]);
      setNewCatName('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (confirm(`Remover categoria "${cat}"?`)) {
      setCategories(categories.filter(c => c !== cat));
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Catálogo de Atrações</h1>
          <p className="text-slate-500 font-medium">Gestão técnica de brinquedos e equipamentos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {isAdmin && (
            <button onClick={() => setIsCatModalOpen(true)} className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-6 py-3 md:py-4 rounded-3xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">
              <Settings size={20} /> Categorias
            </button>
          )}
          {isAdmin && (
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-3xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
              <Plus size={20} strokeWidth={3} /> Cadastrar Brinquedo
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por nome ou categoria..." className="w-full pl-16 pr-6 py-3 md:py-4 bg-transparent outline-none font-bold text-slate-700 text-sm md:text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {filteredToys.map((toy) => (
          <div key={toy.id} className="bg-white rounded-[40px] border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group flex flex-col">
            <div className="relative h-48 md:h-56 overflow-hidden bg-slate-50">
              <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg bg-white ${toy.status === ToyStatus.AVAILABLE ? 'text-emerald-500' : 'text-red-500'}`}>
                  {toy.status}
                </span>
                {toy.size && (
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg bg-blue-600 text-white flex items-center gap-2">
                    <Maximize size={12}/> {toy.size}
                  </span>
                )}
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                 <div className="bg-slate-900/80 text-white px-3 py-1.5 rounded-xl text-[10px] font-black backdrop-blur-sm">
                    QTD: {toy.quantity}
                 </div>
              </div>
            </div>
            <div className="p-6 md:p-7 flex-1 flex flex-col">
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
                    {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Upload size={48} />
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={()=>fileInputRef.current?.click()} 
                      disabled={isSaving}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-2 font-black text-xs uppercase tracking-widest disabled:cursor-not-allowed"
                    >
                        <Upload size={24}/> {selectedImage ? 'Trocar Foto' : previewUrl ? 'Alterar Foto' : 'Adicionar Foto'}
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
                
                {selectedImage && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                    <p className="text-xs text-green-700 font-bold">
                      📷 Nova imagem: {selectedImage.name} ({(selectedImage.size / 1024).toFixed(0)}KB)
                    </p>
                  </div>
                )}

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
