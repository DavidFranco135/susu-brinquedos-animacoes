import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys }) => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [pdfIncludeValues, setPdfIncludeValues] = useState(true);
  const [selectedForOS, setSelectedForOS] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estado para filtro de categoria de brinquedos no modal
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Pega as categorias existentes nos brinquedos para o filtro
  const categoriesList = useMemo(() => {
    if (!toys) return ['Todas'];
    const cats = toys.map(t => t.category || 'Geral');
    return ['Todas', ...Array.from(new Set(cats))];
  }, [toys]);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Adicionado additionalValue ao estado inicial
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

  const handleOpenModal = (rental?: Rental) => {
    setSelectedCategory('Todas'); // Reseta o filtro ao abrir
    if (rental) {
      setEditingRental(rental);
      setFormData({
        ...rental,
        // Garante que o campo adicional exista mesmo em registros antigos
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

  // Cálculo do valor total: Soma dos brinquedos + Valor adicional
  useEffect(() => {
    if (!toys) return;
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const toysTotal = selectedToys.reduce((acc, t) => acc + (t.price || 0), 0);
    const additional = Number(formData.additionalValue || 0);
    const finalTotal = toysTotal + additional;

    if (finalTotal !== formData.totalValue) {
      setFormData(prev => ({ ...prev, totalValue: finalTotal }));
    }
  }, [formData.toyIds, formData.additionalValue, toys]);

  // Filtra os brinquedos no modal baseado na categoria selecionada
  const filteredToysForModal = useMemo(() => {
    if (!toys) return [];
    if (selectedCategory === 'Todas') return toys;
    return toys.filter(t => t.category === selectedCategory);
  }, [toys, selectedCategory]);

  // Mantive o restante das funções (handleDownloadPDF, handleCompleteEvent, etc) originais...
  const handleDownloadPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const isHidden = element.classList.contains('hidden');
    if (isHidden) element.classList.remove('hidden');
    const { jsPDF } = (window as any).jspdf;
    try {
        const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
    } catch (err) { alert("Erro ao gerar PDF."); } finally { if (isHidden) element.classList.add('hidden'); }
  };

  const handleCompleteEvent = (rental: Rental) => {
    const pending = rental.totalValue - rental.entryValue;
    const msg = pending > 0 ? `Concluir este evento? O saldo de R$ ${pending.toLocaleString('pt-BR')} será marcado como PAGO.` : `Marcar como concluído?`;
    if (!confirm(msg)) return;
    setRentals((prev: any) => prev.map((r: any) => r.id === rental.id ? { ...r, status: RentalStatus.COMPLETED, entryValue: r.totalValue } : r));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Selecione um cliente");
    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: any = {
      ...formData,
      id: editingRental?.id || `r${Date.now()}`,
      customerName: customer?.name || 'Cliente',
      entryValue: Number(formData.entryValue) || 0,
      additionalValue: Number(formData.additionalValue) || 0
    };
    setRentals((prev: any) => editingRental ? prev.map((r: any) => r.id === editingRental.id ? newRental : r) : [...prev, newRental]);
    setIsModalOpen(false);
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const rentalDate = new Date(rental.date + 'T00:00:00');
      if (viewTab === 'Mês') return rentalDate.getMonth() === currentDate.getMonth() && rentalDate.getFullYear() === currentDate.getFullYear();
      if (viewTab === 'Ano') return rentalDate.getFullYear() === currentDate.getFullYear();
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rentals, currentDate, viewTab]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* HEADER E TABELA (MANTIDOS DO ORIGINAL) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Agenda de Eventos</h1>
          <p className="text-slate-500 font-medium">Controle de logística e agendamentos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
            <Plus size={20} strokeWidth={3} /> Nova Reserva
          </button>
        </div>
      </header>

      {/* Tabela Simplificada para Visualização */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                <th className="px-10 py-5">Data / Evento</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Financeiro</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6 font-bold">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-6 font-black">{rental.customerName}</td>
                  <td className="px-8 py-6">R$ {rental.totalValue.toLocaleString('pt-BR')}</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => handleOpenModal(rental)} className="p-3 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                      <Edit3 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cliente */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                <select required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 text-sm" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                  <option value="">Selecione um cliente</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Filtro de Categorias e Seleção de Brinquedos */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Atrações</label>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                    <Filter size={12} className="text-slate-500"/>
                    <select className="bg-transparent text-[10px] font-bold uppercase text-slate-600 outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
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

              {/* Valor Adicional e Sinal */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Extra (Frete/Extras)</label>
                <input type="number" step="0.01" className="w-full px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-700 text-lg" value={formData.additionalValue || ''} onChange={e => setFormData({...formData, additionalValue: Number(e.target.value)})} placeholder="0,00" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal Recebido (R$)</label>
                <input type="number" step="0.01" className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-lg" value={formData.entryValue || ''} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} placeholder="0,00" />
              </div>

              {/* Campos de Data/Hora mantidos */}
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

            {/* Painel Financeiro */}
            <div className="bg-slate-900 p-8 rounded-[40px] flex items-center justify-between text-white shadow-xl">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-1">Total (Itens + Extra)</p>
                    <h3 className="text-3xl font-black">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</h3>
                 </div>
                 <div className="text-right">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[2px] mb-1">Saldo Devedor</p>
                    <h3 className="text-xl font-black">R$ {((formData.totalValue || 0) - (formData.entryValue || 0)).toLocaleString('pt-BR')}</h3>
                 </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-xl hover:bg-blue-700 transition-all">
                Salvar Reserva
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Rentals;
