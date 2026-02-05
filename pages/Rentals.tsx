import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Building2, Users, Search } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { deleteDoc, doc, setDoc } from "firebase/firestore";
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
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

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

  const [newCustomerData, setNewCustomerData] = useState<Partial<Customer>>({ 
    name: '', 
    phone: '', 
    address: '', 
    isCompany: false, 
    cnpj: '',
    cpf: '',
    notes: '' 
  });

  const [toyQuantities, setToyQuantities] = useState<{[key: string]: number}>({});

  const handleOpenModal = (rental?: Rental) => {
    if (rental) {
      setEditingRental(rental);
      setFormData(rental);
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
    setIsAddingCustomer(false);
    setIsModalOpen(true);
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const rentalDate = new Date(rental.date + 'T00:00:00');
      
      // Filtro por período (Mês/Ano/Lista)
      let periodMatch = true;
      if (viewTab === 'Mês') {
        periodMatch = rentalDate.getMonth() === currentDate.getMonth() && 
               rentalDate.getFullYear() === currentDate.getFullYear();
      } else if (viewTab === 'Ano') {
        periodMatch = rentalDate.getFullYear() === currentDate.getFullYear();
      }
      
      // Filtro por data customizada (quando preenchido, sobrescreve o filtro de período)
      if (startDateFilter || endDateFilter) {
        const rentalDateOnly = rental.date;
        if (startDateFilter && rentalDateOnly < startDateFilter) {
          periodMatch = false;
        }
        if (endDateFilter && rentalDateOnly > endDateFilter) {
          periodMatch = false;
        }
      }
      
      // Filtro por busca (nome ou documento)
      let searchMatch = true;
      if (searchTerm) {
        const customer = customers.find(c => c.id === rental.customerId);
        const searchLower = searchTerm.toLowerCase();
        searchMatch = 
          rental.customerName?.toLowerCase().includes(searchLower) ||
          customer?.cpf?.includes(searchTerm) ||
          customer?.cnpj?.includes(searchTerm) ||
          customer?.phone?.includes(searchTerm) ||
          false;
      }
      
      return periodMatch && searchMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rentals, currentDate, viewTab, searchTerm, startDateFilter, endDateFilter, customers]);

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
      top: element.style.top,
      width: element.style.width
    };
    
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    
    if (isMobile) {
      element.style.width = '800px';
    } else {
      element.style.width = '1200px';
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = await (window as any).html2canvas(element, {
        scale: isMobile ? 2 : 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: isMobile ? 800 : 1200,
        height: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = (window as any).jspdf;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
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

  const handleAddNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = { 
      id: `c${Date.now()}`, 
      createdAt: new Date().toISOString(), 
      ...(newCustomerData as any) 
    };
    
    try {
      await setDoc(doc(db, "customers", newCustomer.id), newCustomer);
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customerId: newCustomer.id, eventAddress: newCustomer.address || '' }));
      setIsAddingCustomer(false);
      setNewCustomerData({ name: '', phone: '', address: '', isCompany: false, cnpj: '', cpf: '', notes: '' });
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      alert("Erro ao criar o cliente. Tente novamente.");
    }
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

      // Se atingiu o limite de estoque, adiciona na lista de aviso
      if (unitsRented >= toy.quantity) {
        toysBlocked.push(toy.name);
      }
    });

    // Se houver conflito, apenas avisa e pede confirmação para prosseguir
    if (toysBlocked.length > 0) {
      const msg = '⚠️ AVISO DE DISPONIBILIDADE\n\n' +
                  'Os itens abaixo já possuem reservas para o dia ' + 
                  new Date(formData.date! + 'T00:00:00').toLocaleDateString('pt-BR') + ':\n\n• ' + 
                  toysBlocked.join('\n• ') + 
                  '\n\nDeseja confirmar este agendamento mesmo assim?';
      
      if (!confirm(msg)) return;
    }
    
    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) return alert('Cliente não encontrado');

    if (editingRental) {
      setRentals(prev => prev.map(r => 
        r.id === editingRental.id 
          ? { ...r, ...formData, customerName: customer.name } as Rental
          : r
      ));
    } else {
      const newRental: Rental = { 
        id: `r${Date.now()}`, 
        createdAt: new Date().toISOString(), 
        customerName: customer.name,
        ...(formData as any) 
      };
      setRentals(prev => [...prev, newRental]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Reservas de Brinquedos</h1>
            <p className="text-slate-500 font-medium">Controle completo de aluguel de itens.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={handleDownloadReportPDF} className="bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                <Download size={18} className="inline mr-2"/> Exportar PDF
            </button>
            <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
                <Plus size={20} className="inline mr-2"/> Nova Reserva
            </button>
        </div>
      </header>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="rentals-report-print" className="hidden print:block bg-white p-12">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
              <div>
                  <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Relatório de Reservas</h1>
                  <p className="text-lg font-bold text-slate-600 uppercase tracking-widest">
                      {viewTab === 'Mês' && currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      {viewTab === 'Ano' && currentDate.getFullYear()}
                      {viewTab === 'Lista' && 'Todos os Períodos'}
                  </p>
              </div>
              <div className="text-right">
                  <p className="text-xs font-black uppercase text-slate-400">Gerado por {user?.name}</p>
                  <p className="font-bold text-base">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
          </div>

          <table className="w-full text-base text-left border-collapse">
              <thead>
                  <tr className="border-b-2 border-slate-900 font-black uppercase tracking-wider">
                      <th className="py-2 px-2">Data/Hora</th>
                      <th className="py-2 px-2">Cliente</th>
                      <th className="py-2 px-2">Itens</th>
                      <th className="py-2 px-2">Local</th>
                      <th className="py-2 px-2 text-right">Total</th>
                      <th className="py-2 px-2 text-center">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredRentals.map(r => (
                      <tr key={r.id}>
                          <td className="py-2 px-2 font-bold whitespace-nowrap">
                              {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}<br/>
                              <span className="text-sm text-slate-400">{r.startTime}h - {r.endTime}h</span>
                          </td>
                          <td className="py-2 px-2 font-black uppercase">{r.customerName}</td>
                          <td className="py-2 px-2">
                              {toys.filter(t => r.toyIds.includes(t.id)).map(t => t.name).join(', ')}
                              {r.additionalService && <><br/><span className="text-blue-600">+ {r.additionalService}</span></>}
                          </td>
                          <td className="py-2 px-2 leading-tight max-w-[150px]">{r.eventAddress}</td>
                          <td className="py-2 px-2 text-right font-black">R$ {r.totalValue.toLocaleString('pt-BR')}</td>
                          <td className="py-2 px-2 text-center">
                              <span className={'px-2 py-1 rounded-lg text-xs font-black uppercase ' + (
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

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white rounded-3xl border p-6 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Campo de Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF, CNPJ ou telefone..." 
              className="w-full pl-16 pr-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-sm border-0 focus:ring-2 focus:ring-blue-500/20" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full px-6 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" 
              value={startDateFilter} 
              onChange={e => setStartDateFilter(e.target.value)} 
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
            <input 
              type="date" 
              className="w-full px-6 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" 
              value={endDateFilter} 
              onChange={e => setEndDateFilter(e.target.value)} 
            />
          </div>
          {(startDateFilter || endDateFilter) && (
            <button 
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
            >
              Limpar Filtros
            </button>
          )}
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
                  <p className="text-slate-400 font-bold text-lg">Nenhum evento encontrado.</p>
                  <p className="text-slate-400 text-sm mt-2">Ajuste os filtros ou busca para ver mais resultados.</p>
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
                          {!isAddingCustomer ? (
                              <div className="flex gap-2">
                                  <select required className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.customerId} onChange={e => {
                                      const customer = customers.find(c => c.id === e.target.value);
                                      setFormData({...formData, customerId: e.target.value, eventAddress: customer?.address || ''});
                                  }}>
                                      <option value="">Selecione um cliente...</option>
                                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                  <button 
                                      type="button" 
                                      onClick={() => setIsAddingCustomer(true)}
                                      className="px-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2"
                                      title="Novo Cliente"
                                  >
                                      <UserPlus size={18} />
                                  </button>
                              </div>
                          ) : (
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                                  <div className="flex items-center justify-between">
                                      <h4 className="font-black text-sm text-blue-700 uppercase tracking-widest">Novo Cliente</h4>
                                      <button 
                                          type="button" 
                                          onClick={() => {
                                              setIsAddingCustomer(false);
                                              setNewCustomerData({ name: '', phone: '', address: '', isCompany: false, cnpj: '', cpf: '', notes: '' });
                                          }}
                                          className="text-slate-400 hover:text-slate-800 transition-all"
                                      >
                                          <X size={20} />
                                      </button>
                                  </div>

                                  <div className="flex items-center gap-4 p-3 bg-white rounded-2xl">
                                      <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer font-black text-[9px] uppercase tracking-widest transition-all ${!newCustomerData.isCompany ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                                          <input type="radio" className="hidden" checked={!newCustomerData.isCompany} onChange={()=>setNewCustomerData({...newCustomerData, isCompany: false})} /> 
                                          <Users size={14} /> PF
                                      </label>
                                      <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer font-black text-[9px] uppercase tracking-widest transition-all ${newCustomerData.isCompany ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                                          <input type="radio" className="hidden" checked={newCustomerData.isCompany} onChange={()=>setNewCustomerData({...newCustomerData, isCompany: true})} /> 
                                          <Building2 size={14} /> PJ
                                      </label>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2">
                                          <input required placeholder="Nome / Razão Social" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newCustomerData.name} onChange={e=>setNewCustomerData({...newCustomerData, name: e.target.value})} />
                                      </div>

                                      <input required placeholder="WhatsApp" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newCustomerData.phone} onChange={e=>setNewCustomerData({...newCustomerData, phone: e.target.value})} />

                                      {newCustomerData.isCompany ? (
                                          <input placeholder="CNPJ" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newCustomerData.cnpj} onChange={e=>setNewCustomerData({...newCustomerData, cnpj: e.target.value})} />
                                      ) : (
                                          <input placeholder="CPF" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newCustomerData.cpf} onChange={e=>setNewCustomerData({...newCustomerData, cpf: e.target.value})} />
                                      )}

                                      <div className="col-span-2">
                                          <input required placeholder="Endereço" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newCustomerData.address} onChange={e=>setNewCustomerData({...newCustomerData, address: e.target.value})} />
                                      </div>
                                  </div>

                                  <button 
                                      type="button"
                                      onClick={handleAddNewCustomer}
                                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all text-xs"
                                  >
                                      ✓ Salvar Cliente
                                  </button>
                              </div>
                          )}
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
                                      <div key={toy.id} className={`rounded-3xl overflow-hidden transition-all ${isSelected ? 'bg-blue-600 border-2 border-blue-600' : 'bg-white border-2 border-slate-200 hover:border-blue-300'}`}>
                                          <label className="flex items-start gap-3 p-4 cursor-pointer">
                                              <input 
                                                  type="checkbox" 
                                                  className="mt-1"
                                                  checked={isSelected}
                                                  onChange={() => {
                                                      if (isSelected) {
                                                          setFormData({...formData, toyIds: formData.toyIds?.filter(id => id !== toy.id)});
                                                          const newQtys = {...toyQuantities};
                                                          delete newQtys[toy.id];
                                                          setToyQuantities(newQtys);
                                                      } else {
                                                          setFormData({...formData, toyIds: [...(formData.toyIds || []), toy.id]});
                                                          setToyQuantities({...toyQuantities, [toy.id]: 1});
                                                      }
                                                  }}
                                              />
                                              
                                              {toy.imageUrl && (
                                                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                                                      <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover" />
                                                  </div>
                                              )}
                                              
                                              <div className="flex-1">
                                                  <p className={'font-black text-sm mb-1 ' + (isSelected ? 'text-white' : 'text-slate-800')}>{toy.name}</p>
                                                  <p className={'text-xs ' + (isSelected ? 'text-blue-100' : 'text-slate-400')}>{toy.size || 'Padrão'}</p>
                                                  <p className={'text-sm font-black mt-1 ' + (isSelected ? 'text-white' : 'text-slate-700')}>R$ {toy.price.toFixed(2)}</p>
                                              </div>
                                          </label>
                                          
                                          {isSelected && (
                                              <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-blue-500/20 pt-3">
                                                  <span className="text-xs font-bold text-white opacity-80">Qtd:</span>
                                                  <div className="flex items-center gap-2">
                                                      <button
                                                          type="button"
                                                          onClick={(e) => {
                                                              e.preventDefault();
                                                              if (quantity > 1) {
                                                                  setToyQuantities({...toyQuantities, [toy.id]: quantity - 1});
                                                              }
                                                          }}
                                                          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all text-sm"
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
                                                          className="w-14 h-7 rounded-lg bg-white text-blue-600 text-center font-black text-sm border-0 outline-none"
                                                      />
                                                      <button
                                                          type="button"
                                                          onClick={(e) => {
                                                              e.preventDefault();
                                                              if (quantity < toy.quantity) {
                                                                  setToyQuantities({...toyQuantities, [toy.id]: quantity + 1});
                                                              }
                                                          }}
                                                          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all text-sm"
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
