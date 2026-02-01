import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
  categories: string[]; // Adicionado para ler as categorias do catálogo
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys, categories }) => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [selectedForOS, setSelectedForOS] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX' as PaymentMethod,
    status: RentalStatus.PENDING,
    category: categories[0] || 'Geral' // Inicializa com a primeira categoria real
  });

  // Filtro de brinquedos por categoria selecionada no formulário
  const availableToysFiltered = toys.filter(t => t.category === formData.category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.toyIds?.length === 0) {
      alert("Selecione um cliente e ao menos um item.");
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    
    const newRental: Rental = {
      ...formData,
      id: editingRental?.id || `r${Date.now()}`,
      customerName: customer?.name || '',
      status: formData.status || RentalStatus.PENDING,
    } as Rental;

    if (editingRental) {
      setRentals(prev => prev.map(r => r.id === editingRental.id ? newRental : r));
    } else {
      setRentals(prev => [...prev, newRental]);
    }
    
    setIsModalOpen(false);
    setEditingRental(null);
  };

  const handleEdit = (rental: Rental) => {
    setEditingRental(rental);
    setFormData(rental);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Reservas</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[3px] mt-2">Agenda de Eventos</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingRental(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              startTime: '14:00',
              endTime: '18:00',
              toyIds: [],
              totalValue: 0,
              entryValue: 0,
              paymentMethod: 'PIX',
              status: RentalStatus.PENDING,
              category: categories[0] || 'Geral'
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} /> Nova Reserva
        </button>
      </header>

      {/* Grid de Reservas (Simplificado para o exemplo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rentals.map(rental => (
          <div key={rental.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-50 px-4 py-2 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase leading-none mb-1">Data</p>
                <p className="text-sm font-black text-blue-700">{rental.date.split('-').reverse().join('/')}</p>
              </div>
              <button onClick={() => handleEdit(rental)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                <Edit3 size={18} />
              </button>
            </div>
            <h3 className="font-black text-slate-800 uppercase text-lg mb-1">{rental.customerName}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mb-4">{rental.startTime}h às {rental.endTime}h</p>
            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">{rental.category}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE RESERVA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl p-6 md:p-10 my-8">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {editingRental ? 'Editar Reserva' : 'Configurar Reserva'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                {/* Seleção de Cliente */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cliente</label>
                  <select 
                    required
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* FILTRO DE CATEGORIA (Lendo do Catálogo) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria do Evento</label>
                  <select 
                    className="w-full px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black border-0 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value, toyIds: []})}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                  <p className="text-[9px] font-bold text-blue-400 px-2 uppercase">Isto filtrará os itens disponíveis abaixo</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data</label>
                    <input type="date" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Pagamento</label>
                    <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                      <option value="PIX">PIX</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="CARTAO">Cartão</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seleção de Itens (Baseado na categoria) */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Itens de {formData.category}</label>
                  <div className="bg-slate-50 rounded-[32px] p-4 max-h-[300px] overflow-y-auto custom-scrollbar border-2 border-dashed border-slate-100">
                    {availableToysFiltered.length > 0 ? (
                      availableToysFiltered.map(toy => (
                        <label key={toy.id} className="flex items-center gap-4 p-3 hover:bg-white rounded-2xl transition-all cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20"
                            checked={formData.toyIds?.includes(toy.id)}
                            onChange={e => {
                                const next = e.target.checked 
                                    ? [...(formData.toyIds || []), toy.id]
                                    : (formData.toyIds || []).filter(id => id !== toy.id);
                                setFormData({...formData, toyIds: next});
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-xs font-black text-slate-700 uppercase">{toy.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">R$ {toy.price}</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-center py-10 text-[10px] font-bold text-slate-300 uppercase">Nenhum item nesta categoria</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Total</label>
                        <input type="number" className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl font-black border-0" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Sinal (Entrada)</label>
                        <input type="number" className="w-full px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black border-0" value={formData.entryValue} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} />
                    </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                   <CheckCircle2 size={20}/> {editingRental ? 'Salvar Alterações' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rentals;
