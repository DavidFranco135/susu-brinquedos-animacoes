import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, Edit3, CheckCircle2, Filter, Download, Trash2 } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
  categories?: string[]; // Tornada opcional para evitar quebra
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys, categories = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const [formData, setFormData] = useState<Partial<Rental & { additionalValue: number }>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    status: RentalStatus.PENDING,
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    additionalValue: 0,
    paymentMethod: 'PIX',
    eventAddress: ''
  });

  // CORREÇÃO: Extrai categorias diretamente dos brinquedos se a prop vier vazia
  const allCategories = useMemo(() => {
    const categoriesFromToys = toys.map(t => t.category).filter(Boolean) as string[];
    const combined = Array.from(new Set([...categories, ...categoriesFromToys]));
    return ['Todas', ...combined];
  }, [categories, toys]);

  // Filtro de brinquedos no modal
  const filteredToysForModal = useMemo(() => {
    if (!toys) return [];
    if (selectedCategory === 'Todas') return toys;
    return toys.filter(t => t.category === selectedCategory);
  }, [toys, selectedCategory]);

  const handleOpenModal = (rental?: Rental) => {
    setSelectedCategory('Todas');
    if (rental) {
      setEditingRental(rental);
      setFormData({
        ...rental,
        toyIds: rental.toyIds || [],
        additionalValue: (rental as any).additionalValue || 0
      });
    } else {
      setEditingRental(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '18:00',
        status: RentalStatus.PENDING,
        toyIds: [],
        totalValue: 0,
        entryValue: 0,
        additionalValue: 0,
        paymentMethod: 'PIX',
        eventAddress: ''
      });
    }
    setIsModalOpen(true);
  };

  // Cálculo automático do valor total
  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const toysPriceSum = selectedToys.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
    const extra = Number(formData.additionalValue) || 0;
    const total = toysPriceSum + extra;

    if (total !== formData.totalValue) {
      setFormData(prev => ({ ...prev, totalValue: total }));
    }
  }, [formData.toyIds, formData.additionalValue, toys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Selecione um cliente");
    if (!formData.toyIds || formData.toyIds.length === 0) return alert("Selecione pelo menos um brinquedo");

    const customer = customers.find(c => c.id === formData.customerId);
    
    const rentalData: any = {
      ...formData,
      id: editingRental?.id || `rent-${Date.now()}`,
      customerName: customer?.name || 'Cliente',
      totalValue: Number(formData.totalValue),
      entryValue: Number(formData.entryValue) || 0,
      additionalValue: Number(formData.additionalValue) || 0,
      toyIds: formData.toyIds // Garante que o array de IDs seja salvo
    };

    setRentals((prev: Rental[]) => {
      if (editingRental) {
        return prev.map(r => r.id === editingRental.id ? rentalData : r);
      }
      return [rentalData, ...prev];
    });

    setIsModalOpen(false);
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      if (viewTab === 'Mês') return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      if (viewTab === 'Ano') return d.getFullYear() === currentDate.getFullYear();
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rentals, currentDate, viewTab]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Agenda</h1>
          <p className="text-slate-500 font-medium">Gestão de locações e brinquedos.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus size={20} /> Nova Reserva
        </button>
      </header>

      {/* Tabela de Reservas */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-10 py-5">Data</th>
              <th className="px-8 py-5">Cliente</th>
              <th className="px-8 py-5">Brinquedos</th>
              <th className="px-8 py-5">Total</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredRentals.map(rental => (
              <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6 font-bold">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-6 font-black text-slate-700">{rental.customerName}</td>
                <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                  {toys.filter(t => rental.toyIds?.includes(t.id)).map(t => t.name).join(', ') || 'Nenhum'}
                </td>
                <td className="px-8 py-6 font-black text-blue-600">R$ {rental.totalValue.toLocaleString('pt-BR')}</td>
                <td className="px-8 py-6 text-right">
                  <button onClick={() => handleOpenModal(rental)} className="p-3 bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                    <Edit3 size={18}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar' : 'Nova Reserva'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                <select required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Filtro de Categoria e Brinquedos */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleção de Brinquedos</label>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    <Filter size={12} className="text-slate-500"/>
                    <select className="bg-transparent text-[10px] font-bold uppercase text-slate-600 outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[32px] border-2 border-slate-100">
                  {filteredToysForModal.map(t => (
                    <label key={t.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData.toyIds?.includes(t.id) ? 'bg-white border-blue-500 shadow-sm' : 'bg-white/50 border-transparent hover:border-slate-200'}`}>
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" checked={formData.toyIds?.includes(t.id)} onChange={e => {
                        const current = formData.toyIds || [];
                        const next = e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id);
                        setFormData({...formData, toyIds: next});
                      }} />
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-700">{t.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">R$ {t.price?.toLocaleString('pt-BR')}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Valor Adicional (Frete/Extras)</label>
                <input type="number" step="0.01" className="w-full px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-700 text-lg" value={formData.additionalValue || ''} onChange={e => setFormData({...formData, additionalValue: Number(e.target.value)})} placeholder="0,00" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal (Entrada)</label>
                <input type="number" step="0.01" className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-lg" value={formData.entryValue || ''} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} placeholder="0,00" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                <input type="date" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}>
                  {Object.values(RentalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[40px] flex items-center justify-between text-white shadow-xl">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total da Reserva</p>
                    <h3 className="text-3xl font-black text-white">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</h3>
                 </div>
                 <div className="text-right">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Saldo a Receber</p>
                    <h3 className="text-xl font-black">R$ {((formData.totalValue || 0) - (formData.entryValue || 0)).toLocaleString('pt-BR')}</h3>
                 </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-xl hover:bg-blue-700 transition-all">
              {editingRental ? 'Salvar Alterações' : 'Confirmar Reserva'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Rentals;
