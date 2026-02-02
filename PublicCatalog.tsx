import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Star, Package, MessageCircle, ArrowLeft, Maximize, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Toy, ToyStatus, CompanySettings } from './types';
import { useNavigate } from 'react-router-dom';
// ✅ ADICIONAR:
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";


const PublicCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [toys, setToys] = useState<Toy[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // Estados para visualização de álbum
  const [viewingAlbum, setViewingAlbum] = useState<Toy | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Estado para visualização de descrição completa
  const [viewingDescription, setViewingDescription] = useState<Toy | null>(null);

  useEffect(() => {
    // Carrega brinquedos em tempo real
    const unsubToys = onSnapshot(
      query(collection(db, "toys"), orderBy("name")), 
      (snap) => setToys(snap.docs.map(d => ({ ...d.data(), id: d.id } as Toy)))
    );

    // Carrega dados da empresa
    const unsubCompany = onSnapshot(
      doc(db, "settings", "company"),
      (docSnap) => {
        if (docSnap.exists()) setCompany(docSnap.data() as CompanySettings);
      }
    );

    return () => { 
      unsubToys(); 
      unsubCompany(); 
    };
  }, []);

  // Extrai categorias únicas
  const categories = ['Todos', ...Array.from(new Set(toys.map(t => t.category)))];

  // Filtra brinquedos
  const filteredToys = toys.filter(toy => {
    const matchesSearch = toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (toy.description && toy.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todos' || toy.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Função para gerar mensagem do WhatsApp
  const handleWhatsAppClick = (toyName: string) => {
    const phone = company?.phone?.replace(/\D/g, '') || '5521970386065';
    const message = encodeURIComponent(
      `Olá! Gostaria de solicitar um orçamento para: *${toyName}*`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Funções para gerenciar o álbum de fotos
  const getToyImages = (toy: Toy): string[] => {
    if (toy.images && toy.images.length > 0) {
      return toy.images;
    }
    return toy.imageUrl ? [toy.imageUrl] : [];
  };

  const getToyMainImage = (toy: Toy): string => {
    if (toy.images && toy.images.length > 0) {
      return toy.images[0];
    }
    return toy.imageUrl || 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&q=80&w=400';
  };

  const openAlbumViewer = (toy: Toy) => {
    setViewingAlbum(toy);
    setCurrentImageIndex(0);
  };

  const closeAlbumViewer = () => {
    setViewingAlbum(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (!viewingAlbum) return;
    const images = getToyImages(viewingAlbum);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (!viewingAlbum) return;
    const images = getToyImages(viewingAlbum);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Público */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-xl overflow-hidden">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Star size={28} className="text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight brand-font">
                  {company?.name || 'SUSU Animações'}
                </h1>
                <p className="text-slate-500 font-medium text-sm">Catálogo de Brinquedos e Animações</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all"
            >
              <ArrowLeft size={18} /> Área do Cliente
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-8">
        {/* Barra de Busca e Filtros */}
        <div className="bg-white rounded-[40px] border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar brinquedos ou animações..."
              className="w-full pl-16 pr-6 py-4 bg-slate-50 rounded-3xl border-0 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro de Categorias */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xl'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Brinquedos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredToys.map((toy) => (
            <div
              key={toy.id}
              className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
            >
              {/* Imagem */}
              <div className="relative h-64 bg-slate-100 overflow-hidden">
                <img
                  src={getToyMainImage(toy)}
                  alt={toy.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                  onClick={() => openAlbumViewer(toy)}
                />
                {getToyImages(toy).length > 1 && (
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Maximize size={12} />
                    {getToyImages(toy).length} fotos
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      toy.status === ToyStatus.AVAILABLE
                        ? 'bg-emerald-500 text-white'
                        : toy.status === ToyStatus.RESERVED
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-500 text-white'
                    }`}
                  >
                    {toy.status}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">
                    {toy.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {toy.category} {toy.size && `• ${toy.size}`}
                  </p>
                  {toy.description && (
                    <div>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {toy.description}
                      </p>
                      {toy.description.length > 100 && (
                        <button
                          onClick={() => setViewingDescription(toy)}
                          className="text-sm text-blue-600 font-bold hover:text-blue-700 mt-2 underline"
                        >
                          Ver descrição completa
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Valor Locação- 
                      a partir de:
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      R$ {toy.price.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleWhatsAppClick(toy.name)}
                    className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
                  >
                    <MessageCircle size={16} /> Pedir Orçamento
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem quando não há resultados */}
        {filteredToys.length === 0 && (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tight mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-slate-400 font-medium">
              Tente ajustar os filtros ou a busca
            </p>
          </div>
        )}
      </main>

      {/* Modal de Descrição Completa */}
      {viewingDescription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-2xl w-full p-8 shadow-2xl relative">
            <button 
              onClick={() => setViewingDescription(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={24} className="text-slate-400" />
            </button>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase">{viewingDescription.name}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                    {viewingDescription.category}
                  </span>
                  {viewingDescription.size && <span>• Tamanho: {viewingDescription.size}</span>}
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    viewingDescription.status === ToyStatus.AVAILABLE
                      ? 'bg-emerald-100 text-emerald-700'
                      : viewingDescription.status === ToyStatus.RESERVED
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {viewingDescription.status}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Descrição Completa</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {viewingDescription.description}
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor da Locação
                  a partir de:</p>
                  <p className="text-3xl font-black text-blue-600">R$ {viewingDescription.price.toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setViewingDescription(null);
                      openAlbumViewer(viewingDescription);
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Maximize size={16} />
                    Ver Fotos
                  </button>
                  <button
                    onClick={() => handleWhatsAppClick(viewingDescription.name)}
                    className="px-4 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Pedir Orçamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Álbum */}
      {viewingAlbum && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <button 
            onClick={closeAlbumViewer}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
          >
            <X size={24} />
          </button>
          
          <div className="relative w-full max-w-4xl">
            {getToyImages(viewingAlbum).length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}
            
            <div className="bg-slate-900 rounded-3xl overflow-hidden">
              <img
                src={getToyImages(viewingAlbum)[currentImageIndex]}
                alt={`${viewingAlbum.name} - Foto ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              <div className="p-6 text-white">
                <h3 className="text-2xl font-black mb-2">{viewingAlbum.name}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    Foto {currentImageIndex + 1} de {getToyImages(viewingAlbum).length}
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-blue-400">
                      R$ {viewingAlbum.price.toLocaleString('pt-BR')}
                    </p>
                    <button
                      onClick={() => handleWhatsAppClick(viewingAlbum.name)}
                      className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all"
                    >
                      <MessageCircle size={14} /> Pedir Orçamento
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {getToyImages(viewingAlbum).length > 1 && (
              <div className="flex gap-2 justify-center mt-4 overflow-x-auto pb-2">
                {getToyImages(viewingAlbum).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex 
                        ? 'border-blue-500 ring-2 ring-blue-500/50' 
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 text-center space-y-4">
          <p className="text-slate-400 font-bold text-sm">
            {company?.name || 'SUSU Animações e Brinquedos'}
          </p>
          {company?.phone && (
            <p className="text-slate-500 font-medium text-xs">
              WhatsApp: {company.phone} | Email: {company.email}
            </p>
          )}
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalog;
