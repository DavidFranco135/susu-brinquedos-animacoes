import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { deleteDoc, doc } from "firebase/firestore";
import { db } from '../firebase';
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
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(toys.map(t => t.category)));
    return ['TODAS', ...uniqueCategories];
  }, [toys]);

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    status: RentalStatus.PENDING,
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX',
    eventAddress: '',
    additionalService: '',
    additionalServiceValue: 0
  });

  // Estado para controlar quantidade de cada brinquedo
  const [toyQuantities, setToyQuantities] = useState<{[key: string]: number}>({});

  const handleOpenModal = (rental?: Rental) => {
    if (rental) {
      setEditingRental(rental);
      setFormData(rental);
      // Carregar quantidades dos brinquedos selecionados (todos com quantidade 1 por padrão)
      const quantities: {[key: string]: number} = {};
      rental.toyIds?.forEach(id => {
        quantities[id] = 1;
      });
      setToyQuantities(quantities);
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
        eventAddress: '',
        additionalService: '',
        additionalServiceValue: 0
      });
      setToyQuantities({});
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

  const filteredToys = useMemo(() => {
    if (selectedCategory === 'TODAS') return toys;
    return toys.filter(t => t.category === selectedCategory);
  }, [toys, selectedCategory]);

  const changeTime = (offset: number) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewTab === 'Mês') next.setMonth(next.getMonth() + offset);
      else if (viewTab === 'Ano') next.setFullYear(next.getFullYear() + offset);
      return next;
    });
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
    const toysTotal = selectedToys.reduce((acc, t) => {
      const qty = toyQuantities[t.id] || 1;
      return acc + ((t.price || 0) * qty);
    }, 0);
    const additionalValue = Number(formData.additionalServiceValue) || 0;
    const total = toysTotal + additionalValue;
    
    if (total !== formData.totalValue) {
      setFormData(prev => ({ ...prev, totalValue: total }));
    }
  }, [formData.toyIds, toyQuantities, formData.additionalServiceValue, toys]);

  const handleDownloadPDFUniversal = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isMobile = window.innerWidth < 768;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdf-loading';
    loadingDiv.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center';
    loadingDiv.innerHTML = '<div class="bg-white rounded-3xl p-8 text-center space-y-4"><div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div><p class="font-black text-slate-800 text-sm uppercase tracking-widest">Gerando PDF...</p><p class="text-xs text-slate-400">Isso pode levar alguns segundos</p></div>';
    document.body.appendChild(loadingDiv);
    
    const originalStyles = {
      display: element.style.display,
      position: element.style.position,
      left: element.style.left,
      width: element.style.width,
      maxWidth: element.style.maxWidth,
      transform: element.style.transform,
      overflow: element.style.overflow
    };
    
    element.classList.remove('hidden');
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '794px';
    element.style.maxWidth = '794px';
    element.style.transform = 'scale(1)';
    element.style.overflow = 'visible';
    
    await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 500));
    
    const { jsPDF } = (window as any).jspdf;
    
    try {
      const canvas = await (window as any).html2canvas(element, { 
        scale: isMobile ? 2 : 3,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        windowHeight: element.scrollHeight,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc: any) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.querySelectorAll('button, .no-print').forEach((el: any) => el.remove());
            clonedElement.style.fontSmoothing = 'antialiased';
            clonedElement.style.webkitFontSmoothing = 'antialiased';
            
            const textElements = clonedElement.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
            textElements.forEach((el: any) => {
              el.style.wordBreak = 'normal';
              el.style.overflowWrap = 'normal';
              el.style.whiteSpace = 'normal';
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      if (isMobile) {
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename + '.pdf';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        pdf.save(filename + '.pdf');
      }
      
      loadingDiv.innerHTML = '<div class="bg-white rounded-3xl p-8 text-center space-y-4"><div class="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><p class="font-black text-slate-800 text-sm uppercase tracking-widest">PDF Gerado!</p></div>';
      
      setTimeout(() => loadingDiv.remove(), 1500);
      
    } catch (err) {
      console.error("PDF Error:", err);
      
      loadingDiv.innerHTML = '<div class="bg-white rounded-3xl p-8 text-center space-y-4 max-w-sm"><div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg></div><p class="font-black text-slate-800 text-sm uppercase tracking-widest">Erro ao gerar PDF</p><p class="text-xs text-slate-400">Tente novamente ou use um navegador diferente</p><button onclick="document.getElementById(\'pdf-loading\').remove()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase">Fechar</button></div>';
      
    } finally {
      Object.keys(originalStyles).forEach(key => {
        (element.style as any)[key] = originalStyles[key as keyof typeof originalStyles];
      });
      
      if (element.classList.contains('hidden')) {
        element.classList.add('hidden');
      }
    }
  };

  const handleDownloadReportPDF = () => {
    const period = viewTab === 'Mês' 
      ? currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
      : currentDate.getFullYear();
    handleDownloadPDFUniversal('rentals-report-print', 'Relatorio-Reservas-' + period);
  };

  const handleCompleteEvent = (rental: Rental) => {
    const pending = rental.totalValue - rental.entryValue;
    const msg = pending > 0 
      ? 'Concluir este evento? O saldo de R$ ' + pending.toLocaleString('pt-BR') + ' será marcado como PAGO e entrará no financeiro.'
      : 'Marcar este evento como concluído?';
      
    if (!confirm(msg)) return;
    
    setRentals(prev => prev.map(r => r.id === rental.id ? {
      ...r,
      status: RentalStatus.COMPLETED,
      entryValue: r.totalValue 
    } : r));
  };

 const handleDeleteRental = async (id: string) => {
  if (!confirm("Tem certeza que deseja APAGAR esta reserva permanentemente?")) return;
  
  try {
    await deleteDoc(doc(db, "rentals", id));
    setRentals(prev => prev.filter(r => r.id !== id));
  } catch (error) {
    console.error("Erro ao excluir:", error);
    alert("Erro ao excluir a reserva.");
  }
};

  const handleSendWhatsApp = (rental: Rental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer?.phone) return alert("Cliente sem telefone cadastrado.");
    
    const toysNames = toys.filter(t => rental.toyIds.includes(t.id)).map(t => t.name + ' (' + (t.size || 'Unico') + ')').join(', ');
    const formattedDate = new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const pending = rental.totalValue - rental.entryValue;

    let message = 
      '📋 *CONFIRMAÇÃO DE RESERVA - SUSU ANIMAÇÕES*\n\n' +
      'Olá, *' + rental.customerName + '*! Tudo bem?\n' +
      'Segue o resumo da sua reserva:\n\n' +
      '📅 *Data:* ' + formattedDate + '\n' +
      '⏰ *Horário:* ' + rental.startTime + ' às ' + rental.endTime + '\n' +
      '📍 *Local:* ' + rental.eventAddress + '\n' +
      '🎮 *Brinquedos:* ' + toysNames + '\n';

    if (rental.additionalService && rental.additionalServiceValue) {
      message += '➕ *Adicional:* ' + rental.additionalService + ' - R$ ' + rental.additionalServiceValue.toLocaleString('pt-BR') + '\n';
    }

    message += 
      '\n💰 *Valor Total:* R$ ' + rental.totalValue.toLocaleString('pt-BR') + '\n' +
      '💳 *Sinal Pago:* R$ ' + rental.entryValue.toLocaleString('pt-BR') + '\n' +
      '💵 *Saldo Restante:* *R$ ' + pending.toLocaleString('pt-BR') + '*\n\n' +
      'Aguardamos você para um dia de muita diversão! 🎉';

    const text = encodeURIComponent(message);
    const cleanPhone = customer.phone.replace(/\D/g, '');
    window.open('https://wa.me/55' + cleanPhone + '?text=' + text, '_blank');
  };

  const handleCopyLink = (rental: Rental) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = baseUrl + '#/resumo/' + rental.id;
    
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
      return alert('🚫 BRINQUEDO INDISPONÍVEL!\n\nOs itens abaixo já atingiram o limite de estoque para o dia ' + new Date(formData.date! + 'T00:00:00').toLocaleDateString('pt-BR') + ':\n\n• ' + toysBlocked.join('\n• '));
    }
    
    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: Rental = {
      id: editingRental?.id || 'r' + Date.now(),
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
      additionalService: formData.additionalService || '',
      additionalServiceValue: Number(formData.additionalServiceValue) || 0
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

      <div id="rentals-report-print" className="hidden bg-white p-12 text-slate-900">
          <div className="border-b-4 border-slate-900 pb-10 mb-10 flex justify-between items-end">
              <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                      {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
                  </div>
                  <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter">Relatório de Eventos</h1>
                      <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-2">
                        {viewTab === 'Mês' ? currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : 'Ano ' + currentDate.getFullYear()}
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
                      <th className="py-4 px-2">Itens</th>
                      <th className="py-4 px-2">Local</th>
                      <th className="py-4 px-2 text-right">Total</th>
                      <th className="py-4 px-2 text-center">Status</th>
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
                          <td className="py-4 px-2 text-[10px]">
                              {toys.filter(t => r.toyIds.includes(t.id)).map(t => t.name).join(', ')}
                              {r.additionalService && <><br/><span className="text-blue-600">+ {r.additionalService}</span></>}
                          </td>
                          <td className="py-4 px-2 text-[10px] leading-tight max-w-[150px]">{r.eventAddress}</td>
                          <td className="py-4 px-2 text-right font-black">R$ {r.totalValue.toLocaleString('pt-BR')}</td>
                          <td className="py-4 px-2 text-center">
                              <span className={'px-2 py-1 rounded-lg text-[9px] font-black uppercase ' + (
                                  r.status === RentalStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                                  r.status === RentalStatus.CONFIRMED ? 'bg-blue-100 text-blue-700' :
                                  r.status === RentalStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              )}>{r.status}</span>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-12 pt-6 border-t border-slate-200 text-right">
              <p className="text-xs text-slate-400 uppercase font-black">Total de Eventos: {filteredRentals.length}</p>
              <p className="text-lg font-black text-slate-900">
                  Faturamento: R$ {filteredRentals.reduce((acc, r) => acc + r.totalValue, 0).toLocaleString('pt-BR')}
              </p>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 print:hidden">
          <div className="flex gap-2 bg-white p-2 rounded-3xl border shadow-sm">
              {(['Mês', 'Ano', 'Lista'] as const).map(tab => (
                  <button key={tab} onClick={() => setViewTab(tab)} className={'px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ' + (viewTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600')}>
                      {tab === 'Mês' && <CalendarIcon size={16} className="inline mr-2" />}
                      {tab === 'Ano' && <BarChart3 size={16} className="inline mr-2" />}
                      {tab === 'Lista' && <List size={16} className="inline mr-2" />}
                      {tab}
                  </button>
              ))}
          </div>

          {viewTab !== 'Lista' && (
              <div className="flex items-center gap-4 bg-white p-3 rounded-3xl border shadow-sm">
                  <button onClick={() => changeTime(-1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronLeft size={20} className="text-slate-400" /></button>
                  <span className="font-black text-slate-800 uppercase tracking-wide min-w-[180px] text-center">
                      {viewTab === 'Mês' ? currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}
                  </span>
                  <button onClick={() => changeTime(1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronRight size={20} className="text-slate-400" /></button>
              </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRentals.length === 0 ? (
              <div className="col-span-full text-center py-20">
                  <CalendarDays size={64} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-lg">Nenhum evento agendado para este período.</p>
              </div>
          ) : (
              filteredRentals.map(rental => {
                  const rentalToys = toys.filter(t => rental.toyIds.includes(t.id));
                  const pending = rental.totalValue - rental.entryValue;

                  return (
                      <div key={rental.id} className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                          <div className={'p-6 border-b ' + (
                              rental.status === RentalStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600' :
                              rental.status === RentalStatus.CONFIRMED ? 'bg-blue-50 text-blue-600' :
                              rental.status === RentalStatus.PENDING ? 'bg-yellow-50 text-yellow-600' :
                              'bg-red-50 text-red-600'
                          )}>
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase tracking-widest">{rental.status}</span>
                                  <span className="text-xs font-bold">#{rental.id.slice(-6).toUpperCase()}</span>
                              </div>
                          </div>

                          <div className="p-6 space-y-6">
                              <div>
                                  <h3 className="text-xl font-black text-slate-800 mb-1">{rental.customerName}</h3>
                                  <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1"><MapPin size={12}/> {rental.eventAddress}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><CalendarIcon size={10}/> Data</p>
                                      <p className="font-bold text-slate-800">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                  </div>
                                  <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Clock size={10}/> Horário</p>
                                      <p className="font-bold text-slate-800">{rental.startTime} - {rental.endTime}</p>
                                  </div>
                              </div>

                              <div className="pt-4 border-t border-slate-50">
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Itens Locados ({rentalToys.length})</p>
                                  <div className="flex flex-wrap gap-2">
                                      {rentalToys.slice(0, 3).map(toy => (
                                          <span key={toy.id} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold">{toy.name}</span>
                                      ))}
                                      {rentalToys.length > 3 && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">+{rentalToys.length - 3}</span>}
                                  </div>
                                  {rental.additionalService && rental.additionalServiceValue && rental.additionalServiceValue > 0 && (
                                      <div className="mt-3 p-3 bg-purple-50 rounded-2xl border border-purple-100">
                                          <p className="text-[9px] font-black text-purple-400 uppercase mb-1">Adicional</p>
                                          <p className="text-xs font-bold text-purple-700">{rental.additionalService}</p>
                                          <p className="text-sm font-black text-purple-600 mt-1">R$ {rental.additionalServiceValue?.toLocaleString('pt-BR')}</p>
                                      </div>
                                  )}
                              </div>

                              <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center">
                                  <div>
                                      <p className="text-[8px] text-slate-500 font-black uppercase">Total</p>
                                      <p className="text-xl font-black text-white">R$ {rental.totalValue.toLocaleString('pt-BR')}</p>
                                  </div>
                                  {pending > 0 && (
                                      <div className="text-right">
                                          <p className="text-[8px] text-yellow-500 font-black uppercase">Pendente</p>
                                          <p className="text-lg font-black text-yellow-400">R$ {pending.toLocaleString('pt-BR')}</p>
                                      </div>
                                  )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                  <button onClick={() => handleSendWhatsApp(rental)} className="flex-1 bg-green-50 text-green-600 py-3 px-4 rounded-2xl font-bold text-xs uppercase hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                      <MessageCircle size={14} /> WhatsApp
                                  </button>
                                  {rental.status !== RentalStatus.COMPLETED && rental.status !== RentalStatus.CANCELLED && (
                                      <button onClick={() => handleCompleteEvent(rental)} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all" title="Concluir">
                                          <CheckCircle2 size={16}/>
                                      </button>
                                  )}
                                  <button onClick={() => handleOpenModal(rental)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all" title="Editar">
                                      <Edit3 size={16}/>
                                  </button>
                                  <button onClick={() => handleCopyLink(rental)} className="p-3 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all" title="Compartilhar">
                                      <Share2 size={16}/>
                                  </button>
                                  <button onClick={() => handleDeleteRental(rental.id)} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all" title="Excluir">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="bg-white w-full max-w-5xl rounded-[40px] p-10 space-y-8 my-8 shadow-2xl max-h-[95vh] overflow-y-auto">
                  <div className="flex justify-between items-center sticky top-0 bg-white pb-4 border-b z-10">
                      <h2 className="text-3xl font-black text-slate-800">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all">
                          <X size={24}/>
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                          <select required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.customerId} onChange={e => {
                              const customer = customers.find(c => c.id === e.target.value);
                              setFormData({...formData, customerId: e.target.value, eventAddress: customer?.address || ''});
                          }}>
                              <option value="">Selecione um cliente...</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da Reserva</label>
                          <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}>
                              {Object.values(RentalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Evento</label>
                          <input type="date" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                              <input type="time" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                              <input type="time" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                          </div>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço do Evento</label>
                          <input type="text" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.eventAddress} onChange={e => setFormData({...formData, eventAddress: e.target.value})} placeholder="Local onde será realizado o evento" />
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brinquedos e Atrações</label>
                          
                          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
                              <Filter size={14} className="text-slate-400" />
                              <select 
                                  className="bg-transparent border-0 font-bold text-xs uppercase text-slate-600 outline-none cursor-pointer"
                                  value={selectedCategory}
                                  onChange={e => setSelectedCategory(e.target.value)}
                              >
                                  {categories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-4 bg-slate-50 rounded-3xl">
                          {filteredToys.length === 0 ? (
                              <div className="col-span-full text-center py-10 text-slate-400 font-bold">
                                  Nenhum brinquedo nesta categoria
                              </div>
                          ) : (
                              filteredToys.map(toy => {
                                  const isSelected = formData.toyIds?.includes(toy.id);
                                  const quantity = toyQuantities[toy.id] || 1;
                                  
                                  return (
                                      <div key={toy.id} className={'rounded-2xl transition-all border-2 overflow-hidden ' + (isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-transparent')}>
                                          <label className="flex items-center gap-3 p-4 cursor-pointer">
                                              <input type="checkbox" className="hidden" checked={isSelected} onChange={() => {
                                                  const newToyIds = isSelected 
                                                      ? formData.toyIds?.filter(id => id !== toy.id) 
                                                      : [...(formData.toyIds || []), toy.id];
                                                  
                                                  if (!isSelected) {
                                                      // Ao selecionar, inicializa quantidade como 1
                                                      setToyQuantities({...toyQuantities, [toy.id]: 1});
                                                  } else {
                                                      // Ao desselecionar, remove a quantidade
                                                      const newQuantities = {...toyQuantities};
                                                      delete newQuantities[toy.id];
                                                      setToyQuantities(newQuantities);
                                                  }
                                                  
                                                  setFormData({...formData, toyIds: newToyIds});
                                              }} />
                                              
                                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                  <img src={toy.imageUrl} className="w-full h-full object-cover" alt={toy.name} />
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-bold text-sm truncate">{toy.name}</p>
                                                  <p className={'text-xs ' + (isSelected ? 'text-blue-100' : 'text-slate-400')}>{toy.size || 'Padrão'}</p>
                                                  <p className={'text-sm font-black mt-1 ' + (isSelected ? 'text-white' : 'text-slate-700')}>R$ {toy.price.toFixed(2)}</p>
                                              </div>

                                              {isSelected && (
                                                  <div className="flex-shrink-0">
                                                      <CheckCircle2 size={24} className="text-white" />
                                              </div>
                                          )}
                                      </label>
                                      
                                      {isSelected && (
                                          <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-blue-500/20 pt-3 mt-1">
                                              <span className="text-xs font-bold text-white opacity-80">Quantidade:</span>
                                              <div className="flex items-center gap-2">
                                                  <button
                                                      type="button"
                                                      onClick={(e) => {
                                                          e.preventDefault();
                                                          if (quantity > 1) {
                                                              setToyQuantities({...toyQuantities, [toy.id]: quantity - 1});
                                                          }
                                                      }}
                                                      className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all"
                                                  >
                                                      -
                                                  </button>
                                                  <input
                                                      type="number"
                                                      min="1"
                                                      max={toy.quantity}
                                                      value={quantity}
                                                      onChange={(e) => {
                                                          const val = parseInt(e.target.value) || 1;
                                                          if (val >= 1 && val <= toy.quantity) {
                                                              setToyQuantities({...toyQuantities, [toy.id]: val});
                                                          }
                                                      }}
                                                      className="w-16 h-8 rounded-lg bg-white text-blue-600 text-center font-black text-sm border-0 outline-none"
                                                  />
                                                  <button
                                                      type="button"
                                                      onClick={(e) => {
                                                          e.preventDefault();
                                                          if (quantity < toy.quantity) {
                                                              setToyQuantities({...toyQuantities, [toy.id]: quantity + 1});
                                                          }
                                                      }}
                                                      className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all"
                                                  >
                                                      +
                                                  </button>
                                              </div>
                                              <span className="text-xs font-bold text-white opacity-80">
                                                  = R$ {(toy.price * quantity).toFixed(2)}
                                              </span>
                                          </div>
                                      )}
                                  </div>
                                  );
                              })
                          )}
                      </div>
                  </div>

                  <div className="p-6 bg-purple-50 rounded-3xl border-2 border-purple-100 space-y-4">
                      <div className="flex items-center gap-2 text-purple-700">
                          <DollarSign size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Serviço Adicional (Opcional)</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Descrição do Adicional</label>
                              <input 
                                  type="text" 
                                  className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-purple-500/20 outline-none" 
                                  value={formData.additionalService || ''} 
                                  onChange={e => setFormData({...formData, additionalService: e.target.value})} 
                                  placeholder="Ex: Monitoria, Decoração, Som..." 
                              />
                          </div>
                          
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Valor do Adicional (R$)</label>
                              <input 
                                  type="number" 
                                  step="0.01" 
                                  className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-purple-500/20 outline-none" 
                                  value={formData.additionalServiceValue || 0} 
                                  onChange={e => setFormData({...formData, additionalServiceValue: Number(e.target.value)})} 
                                  placeholder="0.00" 
                              />
                          </div>
                      </div>

                      {formData.additionalService && formData.additionalServiceValue && formData.additionalServiceValue > 0 && (
                          <div className="p-4 bg-white rounded-2xl">
                              <p className="text-xs font-bold text-purple-600 mb-1">Resumo do Adicional:</p>
                              <p className="font-black text-purple-700">{formData.additionalService} - R$ {formData.additionalServiceValue.toLocaleString('pt-BR')}</p>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Total</label>
                          <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                              <input type="number" step="0.01" readOnly className="w-full pl-14 pr-6 py-5 bg-slate-100 rounded-2xl font-black text-2xl text-slate-900 border-0 cursor-not-allowed" value={formData.totalValue?.toFixed(2)} />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal Pago (Entrada)</label>
                          <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black">R$</span>
                              <input type="number" step="0.01" className="w-full pl-14 pr-6 py-5 bg-emerald-50 rounded-2xl font-black text-xl text-emerald-700 border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.entryValue} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                          <select className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                              <option value="PIX">PIX</option>
                              <option value="DINHEIRO">Dinheiro</option>
                              <option value="DEBITO">Débito</option>
                              <option value="CREDITO">Crédito</option>
                          </select>
                      </div>
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-br from-blue-500 to-blue-700 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all text-lg">
                      {editingRental ? '✓ Atualizar Reserva' : '+ Criar Reserva'}
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export default Rentals;
