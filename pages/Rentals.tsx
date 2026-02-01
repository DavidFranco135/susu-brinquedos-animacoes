
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
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys }) => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [pdfIncludeValues, setPdfIncludeValues] = useState(true);
  const [selectedForOS, setSelectedForOS] = useState<Rental | null>(null);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    status: RentalStatus.PENDING,
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX',
    eventAddress: ''
  });

  const handleOpenModal = (rental?: Rental) => {
    if (rental) {
      setEditingRental(rental);
      setFormData(rental);
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
        paymentMethod: 'PIX',
        eventAddress: ''
      });
    }
    setIsModalOpen(true);
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const rentalDate = new Date(rental.date + 'T00:00:00');
      if (viewTab === 'Mês') {
        return rentalDate.getMonth() === currentDate.getMonth() && 
               rentalDate.getFullYear() === currentDate.getFullYear();
      }
      if (viewTab === 'Ano') {
        return rentalDate.getFullYear() === currentDate.getFullYear();
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rentals, currentDate, viewTab]);

  const changeTime = (offset: number) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewTab === 'Mês') next.setMonth(next.getMonth() + offset);
      else if (viewTab === 'Ano') next.setFullYear(next.getFullYear() + offset);
      return next;
    });
  };

  const openOS = (rental: Rental) => {
    setSelectedForOS(rental);
    setIsOSModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.preSelectedDate) {
      setFormData(prev => ({ ...prev, date: location.state.preSelectedDate }));
      if (location.state?.openModal) setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const total = selectedToys.reduce((acc, t) => acc + (t.price || 0), 0);
    if (total !== formData.totalValue) {
      setFormData(prev => ({ ...prev, totalValue: total }));
    }
  }, [formData.toyIds, toys]);

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
    } catch (err) {
        alert("Erro ao gerar PDF.");
    } finally {
        if (isHidden) element.classList.add('hidden');
    }
  };

  
  
  element.classList.remove('hidden');
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.width = '210mm';
  
  const { jsPDF } = (window as any).jspdf;
  try {
    const canvas = await (window as any).html2canvas(element, { 
      scale: 3,
      useCORS: true,
      logging: false,
      windowWidth: 794,
      windowHeight: element.scrollHeight
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`reserva-${rental.customerName}.pdf`);
  } catch (err) {
    console.error("PDF Error:", err);
    alert("Erro ao gerar a reserva.");
  } finally {
    element.style.display = '';
    element.style.position = '';
    element.style.left = '';
    element.style.width = '';
    element.classList.add('hidden');
  }
};
  const handleCompleteEvent = (rental: Rental) => {
    const pending = rental.totalValue - rental.entryValue;
    const msg = pending > 0 
      ? `Concluir este evento? O saldo de R$ ${pending.toLocaleString('pt-BR')} será marcado como PAGO e entrará no financeiro.`
      : `Marcar este evento como concluído?`;
      
    if (!confirm(msg)) return;
    
    setRentals(prev => prev.map(r => r.id === rental.id ? {
      ...r,
      status: RentalStatus.COMPLETED,
      entryValue: r.totalValue 
    } : r));
  };

  const handleDeleteRental = (id: string) => {
    if (!confirm("Tem certeza que deseja APAGAR esta reserva permanentemente? Esta ação não pode ser desfeita.")) return;
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const handleSendWhatsApp = (rental: Rental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer?.phone) return alert("Cliente sem telefone cadastrado.");
    
    const toysNames = toys.filter(t => rental.toyIds.includes(t.id)).map(t => `${t.name} (${t.size || 'Unico'})`).join(', ');
    const formattedDate = new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const pending = rental.totalValue - rental.entryValue;

    const text = encodeURIComponent(
      `📋 *CONFIRMAÇÃO DE RESERVA - SUSU ANIMAÇÕES*\n\n` +
      `Olá, *${rental.customerName}*! Tudo bem?\n` +
      `Segue o resumo da sua reserva:\n\n` +
      `📅 *Data:* ${formattedDate}\n` +
      `⏰ *Horário:* ${rental.startTime} às ${rental.endTime}\n` +
      `📍 *Local:* ${rental.eventAddress}\n` +
      `🎮 *Brinquedos:* ${toysNames}\n\n` +
      `💰 *Valor Total:* R$ ${rental.totalValue.toLocaleString('pt-BR')}\n` +
      `💳 *Sinal Pago:* R$ ${rental.entryValue.toLocaleString('pt-BR')}\n` +
      `💵 *Saldo Restante:* *R$ ${pending.toLocaleString('pt-BR')}*\n\n` +
      `Aguardamos você para um dia de muita diversão! 🎉`
    );

    const cleanPhone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const handleCopyLink = (rental: Rental) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/resumo/${rental.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Página de resumo gerada e link copiado com sucesso!");
        window.open(shareUrl, '_blank');
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Selecione um cliente");

    const selectedToyIds = formData.toyIds || [];
    const toysBlocked: string[] = [];

    selectedToyIds.forEach(tid => {
      const toy = toys.find(t => t.id === tid);
      if (!toy) return;

      const unitsRented = rentals.filter(r => 
        r.date === formData.date && 
        r.toyIds.includes(tid) && 
        r.status !== RentalStatus.CANCELLED &&
        r.id !== editingRental?.id
      ).length;

      if (unitsRented + 1 > toy.quantity) {
        toysBlocked.push(toy.name);
      }
    });

    if (toysBlocked.length > 0) {
      return alert(`🚫 BRINQUEDO INDISPONÍVEL!\n\nOs itens abaixo já atingiram o limite de estoque para o dia ${new Date(formData.date! + 'T00:00:00').toLocaleDateString('pt-BR')}:\n\n• ${toysBlocked.join('\n• ')}`);
    }
    
    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: Rental = {
      id: editingRental?.id || `r${Date.now()}`,
      customerId: formData.customerId!,
      customerName: customer?.name || 'Cliente',
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      eventAddress: formData.eventAddress || customer?.address || '',
      toyIds: formData.toyIds || [],
      totalValue: formData.totalValue || 0,
      entryValue: Number(formData.entryValue) || 0,
      paymentMethod: formData.paymentMethod as PaymentMethod,
      status: formData.status!,
    };

    setRentals(prev => editingRental ? prev.map(r => r.id === editingRental.id ? newRental : r) : [...prev, newRental]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Agenda de Eventos</h1>
          <p className="text-slate-500 font-medium">Controle de logística e agendamentos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownloadReportPDF} className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <Download size={20} /> Relatório PDF
          </button>
          <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
            <Plus size={20} strokeWidth={3} /> Nova Reserva
          </button>
        </div>
      </header>

      {/* Relatório Geral de Reservas (Oculto) */}
      <div id="rentals-report-print" className="hidden bg-white p-12 text-slate-900 w-[1000px]">
          <div className="border-b-4 border-slate-900 pb-10 mb-10 flex justify-between items-end">
              <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                      {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
                  </div>
                  <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter">Relatório de Eventos</h1>
                      <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-2">
                        {viewTab === 'Mês' ? currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : `Ano ${currentDate.getFullYear()}`}
                      </p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">Gerado por {user?.name}</p>
                  <p className="font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
          </div>

          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-4 px-2">Data/Hora</th>
                      <th className="py-4 px-2">Cliente</th>
                      <th className="py-4 px-2">Brinquedos (Tamanho)</th>
                      <th className="py-4 px-2">Local</th>
                      <th className="py-4 px-2 text-right">Valor Total</th>
                      <th className="py-4 px-2 text-right">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredRentals.map(r => (
                      <tr key={r.id} className="text-[11px]">
                          <td className="py-4 px-2 font-bold whitespace-nowrap">
                              {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}<br/>
                              <span className="text-[9px] text-slate-400">{r.startTime}h - {r.endTime}h</span>
                          </td>
                          <td className="py-4 px-2 font-black uppercase">{r.customerName}</td>
                          <td className="py-4 px-2">
                              {toys.filter(t => r.toyIds.includes(t.id)).map(t => `${t.name} (${t.size || 'U'})`).join(', ')}
                          </td>
                          <td className="py-4 px-2 text-[10px] leading-tight max-w-[150px]">{r.eventAddress}</td>
                          <td className="py-4 px-2 text-right font-black">R$ {r.totalValue.toLocaleString('pt-BR')}</td>
                          <td className="py-4 px-2 text-right">
                              <span className="font-black uppercase text-[9px]">{r.status}</span>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between items-center opacity-40">
              <p className="text-[9px] font-black uppercase">SUSU Animações - Sistema de Gestão</p>
              <p className="text-[9px] font-black uppercase">Total de Eventos no Período: {filteredRentals.length}</p>
          </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="px-8 py-6 bg-slate-50/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {['Mês', 'Ano', 'Lista'].map(tab => (
              <button key={tab} onClick={() => setViewTab(tab as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                {tab}
              </button>
            ))}
          </div>
          
          {viewTab !== 'Lista' && (
            <div className="flex items-center gap-6 bg-white px-6 py-2.5 rounded-2xl border shadow-sm">
                <button onClick={() => changeTime(-1)} className="p-1 hover:text-blue-500"><ChevronLeft size={20}/></button>
                <span className="text-sm font-black uppercase tracking-widest text-slate-700 w-48 text-center">
                  {viewTab === 'Ano' ? currentDate.getFullYear() : currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeTime(1)} className="p-1 hover:text-blue-500"><ChevronRight size={20}/></button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                <th className="px-10 py-5">Data / Evento</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Financeiro</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex flex-col items-center justify-center bg-white border border-slate-200 text-blue-600 rounded-2xl font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <span className="text-[10px] opacity-40 uppercase">{new Date(rental.date + 'T00:00:00').toLocaleString('pt-BR', {month: 'short'})}</span>
                        <span className="text-lg leading-none">{rental.date.split('-')[2]}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">{rental.startTime}h - {rental.endTime}h</span>
                        <span className="text-xs font-black text-slate-800 tracking-tight">#{rental.id.slice(-4)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-800 text-sm">{rental.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">
                      <MapPin size={10} className="inline mr-1"/> {rental.eventAddress}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">R$ {rental.totalValue.toLocaleString('pt-BR')}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${rental.status === RentalStatus.COMPLETED ? 'text-blue-500' : 'text-emerald-500'}`}>
                        {rental.status === RentalStatus.COMPLETED ? 'PAGO' : `Cobrar: R$ ${(rental.totalValue - rental.entryValue).toLocaleString('pt-BR')}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      rental.status === RentalStatus.CONFIRMED ? 'bg-emerald-50 text-emerald-600' : 
                      rental.status === RentalStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                      rental.status === RentalStatus.COMPLETED ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right print:hidden">
                    <div className="flex justify-end gap-2">
                      {rental.status !== RentalStatus.COMPLETED && (
                        <button onClick={() => handleCompleteEvent(rental)} title="Concluir Evento" className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                          <CheckCircle2 size={18}/>
                        </button>
                      )}
                      <button onClick={() => handleSendWhatsApp(rental)} title="Enviar WhatsApp" className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all">
                        <MessageCircle size={18}/>
                      </button>
                      <button onClick={() => handleCopyLink(rental)} title="Gerar Página de Resumo" className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                        <Share2 size={18}/>
                      </button>
                      <button onClick={() => openOS(rental)} title="Ordem de Serviço" className="p-3 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-2xl transition-all">
                        <FileSpreadsheet size={18}/>
                      </button>
                      <button onClick={() => handleOpenModal(rental)} className="p-3 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all">
                        <Edit3 size={18}/>
                      </button>
                      <button onClick={() => handleDeleteRental(rental.id)} title="Apagar Reserva" className="p-3 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all">
                        <Trash2 size={18}/>
                      </button>
                    </div>
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
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configure o cliente e atrações.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                <select required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 text-sm" value={formData.customerId} onChange={e => {
                  const cust = customers.find(c => c.id === e.target.value);
                  setFormData({...formData, customerId: e.target.value, eventAddress: cust?.address || ''});
                }}>
                  <option value="">Selecione na Base de Dados</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={14}/> Endereço do Evento</label>
                <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" value={formData.eventAddress} onChange={e => setFormData({...formData, eventAddress: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><CalendarIcon size={14}/> Data</label>
                <input type="date" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={14}/> Horário</label>
                <div className="flex gap-2">
                  <input type="time" className="flex-1 px-4 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm text-center" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} />
                  <input type="time" className="flex-1 px-4 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm text-center" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Atrações (Verificação automática de estoque)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
                    {toys.map(t => (
                        <label key={t.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData.toyIds?.includes(t.id) ? 'bg-white border-blue-500 shadow-sm' : 'bg-white/50 border-transparent hover:border-slate-200'}`}>
                            <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" checked={formData.toyIds?.includes(t.id)} onChange={e => {
                                const current = formData.toyIds || [];
                                const next = e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id);
                                setFormData({...formData, toyIds: next});
                            }} />
                            <div className="flex-1">
                                <p className="text-xs font-black text-slate-700">{t.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">Disp: {t.quantity} un.</p>
                            </div>
                        </label>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal Recebido (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-lg" 
                  value={formData.entryValue === 0 ? '' : formData.entryValue} 
                  onChange={e => setFormData({...formData, entryValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  placeholder="0,00"
                />
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
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-1">Total</p>
                    <h3 className="text-3xl font-black">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</h3>
                 </div>
                 <div className="text-right">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[2px] mb-1">A Receber</p>
                    <h3 className="text-xl font-black">R$ {((formData.totalValue || 0) - (formData.entryValue || 0)).toLocaleString('pt-BR')}</h3>
                 </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-50 rounded-3xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={18}/> {editingRental ? 'Confirmar Ajustes' : 'Agendar Locação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isOSModalOpen && selectedForOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[400] flex items-center justify-center p-4 print:p-0">
          <div className="bg-white w-full max-w-3xl h-[95vh] print:h-auto rounded-[50px] print:rounded-none overflow-hidden flex flex-col print:block shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 print:hidden">
              <div className="flex gap-4">
                <button onClick={() => setPdfIncludeValues(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pdfIncludeValues ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Completo</button>
                <button onClick={() => setPdfIncludeValues(false)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!pdfIncludeValues ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Sem Valores</button>
              </div>
              <button onClick={() => setIsOSModalOpen(false)} className="p-4 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 md:p-20 bg-white text-slate-900" id="os-print">
               <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                        {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-3xl font-black uppercase tracking-tighter">O.S. de Montagem</h1>
                      <p className="text-xs font-black text-blue-600 uppercase tracking-widest">SUSU Animações e Brinquedos</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">Protocolo</p>
                    <p className="text-xl font-black font-mono">#{selectedForOS.id.slice(-6).toUpperCase()}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-10 py-10 border-b border-slate-100">
                  <div className="space-y-4">
                    <div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Data do Evento</p><p className="text-lg font-black">{new Date(selectedForOS.date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p></div>
                    <div className="flex gap-10">
                      <div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Início</p><p className="text-lg font-black">{selectedForOS.startTime}h</p></div>
                      <div><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Fim</p><p className="text-lg font-black">{selectedForOS.endTime}h</p></div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Cliente</p>
                     <p className="font-black text-lg">{selectedForOS.customerName}</p>
                     <p className="text-sm font-bold flex items-center gap-1 mt-1 text-slate-500"><Phone size={12}/> {customers.find(c=>c.id===selectedForOS.customerId)?.phone}</p>
                  </div>
               </div>

               <div className="py-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg"><MapPin size={16}/></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Local de Entrega</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-200">
                     <p className="text-xl font-black leading-snug">{selectedForOS.eventAddress || "Não especificado"}</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3">Checklist de Atrações</p>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedForOS.toyIds.map(tid => {
                      const toy = toys.find(t=>t.id===tid);
                      return (
                        <div key={tid} className="flex items-center gap-4 p-5 bg-white border-2 border-slate-100 rounded-3xl">
                          <div className="w-6 h-6 border-2 border-slate-300 rounded-lg"></div>
                          <div className="flex-1">
                            <p className="font-black text-slate-900 uppercase text-sm">{toy?.name} ({toy?.size || 'U'})</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{toy?.category}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>

               {pdfIncludeValues && (
                <div className="mt-12 p-8 bg-slate-900 rounded-[40px] flex justify-between items-center text-white">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 mb-1">A Receber</p>
                      <p className="text-sm font-bold uppercase tracking-widest">
                        {selectedForOS.totalValue - selectedForOS.entryValue > 0 
                          ? `R$ ${(selectedForOS.totalValue - selectedForOS.entryValue).toLocaleString('pt-BR')}` 
                          : "PAGO INTEGRALMENTE"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Valor Total</p>
                      <p className="text-xl font-black">R$ {selectedForOS.totalValue.toLocaleString('pt-BR')}</p>
                    </div>
                </div>
               )}

               <div className="mt-16 pt-10 border-t-2 border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[3px]">SUSU Animações - Gestão de Logística</p>
               </div>
            </div>

            <div className="p-10 bg-slate-50 border-t flex justify-end gap-4 print:hidden">
              <button onClick={() => handleDownloadPDF('os-print', `OS-${selectedForOS.customerName}`)} className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95">
                <Download size={20}/> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rentals;
