import React, { useState, useMemo } from 'react';
import { Plus, X, Edit3, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  toys: Toy[];
  categories: string[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, toys, categories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX' as PaymentMethod,
    status: RentalStatus.PENDING,
    category: categories[0] || 'Geral'
  });

  // Filtro de brinquedos baseado na categoria selecionada no formulário
  const availableToysFiltered = useMemo(() => {
    return toys.filter(t => t.category === formData.category);
  }, [toys, formData.category]);

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

  return (
    <div className=\"space-y-8 animate-in fade-in duration-500\">
      <header className=\"flex flex-col md:flex-row md:items-center justify-between gap-6\">
        <div>
          <h1 className=\"text-3xl font-black text-slate-800 tracking-tighter uppercase\">Reservas</h1>
          <p className=\"text-slate-400 font-bold text-xs uppercase tracking-[3px] mt-2\">Agenda de Eventos</p>
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
          className=\"bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95\"
        >
          <Plus size={20} strokeWidth={3} /> Nova Reserva
        </button>
      </header>

      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {rentals.map(rental => (
          <div key={rental.id} className=\"bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all\">
            <div className=\"flex justify-between items-start mb-4 text-sm font-black\">
                <span className=\"bg-blue-50 text-blue-600 px-3 py-1 rounded-xl\">{rental.date.split('-').reverse().join('/')}</span>
                <button onClick={() => { setEditingRental(rental); setFormData(rental); setIsModalOpen(true); }} className=\"text-slate-300 hover:text-blue-600\"><Edit3 size={18}/></button>
            </div>
            <h3 className=\"font-black text-slate-800 uppercase\">{rental.customerName}</h3>
            <div className=\"mt-4 flex gap-2\">
                <span className=\"px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase\">{rental.category}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto\">
          <div className=\"bg-white w-full max-w-4xl rounded-[40px] shadow-2xl p-6 md:p-10 my-8\">
            <div className=\"flex justify-between items-center mb-10\">
              <h2 className=\"text-2xl font-black text-slate-800 uppercase\">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
              <button onClick={() => setIsModalOpen(false)} className=\"p-3 bg-slate-50 rounded-2xl text-slate-400\"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className=\"grid grid-cols-1 md:grid-cols-2 gap-10\">
              <div className=\"space-y-6\">
                <div className=\"space-y-2\">
                  <label className=\"text-[10px] font-black text-slate-400 uppercase\">Cliente</label>
                  <select required className=\"w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold\" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value=\"\">Selecione um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className=\"space-y-2\">
                  <label className=\"text-[10px] font-black text-blue-500 uppercase\">Categoria do Catálogo</label>
                  <select 
                    className=\"w-full px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black border-2 border-blue-100\"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value, toyIds: []})}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className=\"grid grid-cols-2 gap-4\">
                    <input type=\"date\" className=\"px-6 py-4 bg-slate-50 rounded-2xl font-bold\" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <select className=\"px-6 py-4 bg-slate-50 rounded-2xl font-bold\" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                        <option value=\"PIX\">PIX</option>
                        <option value=\"DINHEIRO\">Dinheiro</option>
                    </select>
                </div>
              </div>

              <div className=\"space-y-6\">
                <label className=\"text-[10px] font-black text-slate-400 uppercase\">Itens de {formData.category}</label>
                <div className=\"bg-slate-50 rounded-[32px] p-4 max-h-[250px] overflow-y-auto border-2 border-dashed\">
                  {availableToysFiltered.map(toy => (
                    <label key={toy.id} className=\"flex items-center gap-4 p-3 hover:bg-white rounded-2xl cursor-pointer transition-all\">
                      <input type=\"checkbox\" className=\"w-5 h-5 rounded-lg text-blue-600\" checked={formData.toyIds?.includes(toy.id)} onChange={e => {
                          const next = e.target.checked ? [...(formData.toyIds || []), toy.id] : (formData.toyIds || []).filter(id => id !== toy.id);
                          setFormData({...formData, toyIds: next});
                      }} />
                      <span className=\"text-xs font-black uppercase\">{toy.name} - R$ {toy.price}</span>
                    </label>
                  ))}
                </div>

                <div className=\"grid grid-cols-2 gap-4\">
                    <input type=\"number\" placeholder=\"Total\" className=\"px-6 py-4 bg-slate-900 text-white rounded-2xl font-black\" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: Number(e.target.value)})} />
                    <input type=\"number\" placeholder=\"Sinal\" className=\"px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black\" value={formData.entryValue} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} />
                </div>

                <button type=\"submit\" className=\"w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl\">
                   <CheckCircle2 size={20} className=\"inline mr-2\"/> {editingRental ? 'Salvar' : 'Reservar'}
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
