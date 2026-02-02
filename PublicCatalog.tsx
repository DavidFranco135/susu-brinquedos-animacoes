import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Star, Package, MessageCircle, ArrowLeft } from 'lucide-react';
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
                  src={toy.imageUrl}
                  alt={toy.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
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
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {toy.description}
                    </p>
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
