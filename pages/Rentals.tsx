import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, 
  List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, 
  FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList 
} from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos'); // NOVO ESTADO
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
    status: RentalStatus.PENDING
  });

  // Fecha o modal e limpa o formulário
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRental(null);
    setSelectedCategory('Todos');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '18:00',
      toyIds: [],
      totalValue: 0,
      entryValue: 0,
      paymentMethod: 'PIX' as PaymentMethod,
      status: RentalStatus.PENDING
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.toyIds?.length) {
      alert("Selecione um cliente e ao menos um brinquedo.");
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: Rental = {
      ...(editingRental || {}),
      id: editingRental?.id || `r${Date.now()}`,
      customerId: formData.customerId!,
      customerName: customer?.name || '',
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      toyIds: formData.toyIds!,
      totalValue: formData.totalValue!,
      entryValue: formData.entryValue || 0,
      paymentMethod: formData.paymentMethod!,
      status: formData.status!,
      address: formData.address || customer?.address || '',
    } as Rental;

    if (editingRental) {
      setRentals(prev => prev.map(r => r.id === editingRental.id ? newRental : r));
    } else {
      setRentals(prev => [newRental, ...prev]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta reserva?")) {
      setRentals(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Reservas</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Agenda de Eventos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} /> Nova Reserva
        </button>
      </header>

      {/* Listagem de Reservas Simplificada para Exemplo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rentals.map(rental => (
          <div key={rental.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-50 px-4 py-2 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase">{rental.date.split('-').reverse().join('/')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingRental(rental); setFormData(rental); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 size={18}/></button>
                <button onClick={() => handleDelete(rental.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
              </div>
            </div>
            <h3 className="font-black text-slate-800 text-lg uppercase leading-tight">{rental.customerName}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">{rental.startTime} às {rental.endTime}</p>
          </div>
        ))}
      </div>

      {/* MODAL DE RESERVA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                  {editingRental ? 'Editar Reserva' : 'Nova Reserva'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Preencha os detalhes do evento</p>
              </div>
              <button onClick={closeModal} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* Seção Cliente e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cliente</label>
                  <select 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                  >
                    <option value="">Selecionar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data do Evento</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              {/* Seção Brinquedos com Filtro de Categoria */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Selecione os Brinquedos
                  </label>
                  
                  <select 
                    className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded-lg outline-none border-0 focus:ring-2 focus:ring-blue-500/20"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="Todos">Todas Categorias</option>
                    {Array.from(new Set(toys.map(t => t.category))).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 custom-scrollbar">
                  {toys
                    .filter(t => selectedCategory === 'Todos' || t.category === selectedCategory)
                    .map(toy => (
                      <label 
                        key={toy.id} 
                        className={`flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          formData.toyIds?.includes(toy.id) 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.toyIds?.includes(toy.id)}
                          onChange={(e) => {
                            const currentIds = formData.toyIds || [];
                            const nextIds = e.target.checked
                              ? [...currentIds, toy.id]
                              : currentIds.filter(id => id !== toy.id);
                            
                            // Cálculo automático do valor total
                            const total = toys
                              .filter(t => nextIds.includes(t.id))
                              .reduce((acc, curr) => acc + curr.price, 0);

                            setFormData({ ...formData, toyIds: nextIds, totalValue: total });
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800">{toy.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{toy.category} • R$ {toy.price}</p>
                        </div>
                        {formData.toyIds?.includes(toy.id) && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        )}
                      </label>
                    ))}
                </div>
              </div>

              {/* Seção Valores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor Total (R$)</label>
                  <input 
                    type="number" 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.totalValue}
                    onChange={e => setFormData({...formData, totalValue: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Sinal/Entrada (R$)</label>
                  <input 
                    type="number" 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-lg text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={formData.entryValue}
                    onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {editingRental ? 'Atualizar Reserva' : 'Confirmar Reserva'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rentals;
