import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Building2, Users } from 'lucide-react';
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

  // ✅ NOVO: Estados para modal de novo cliente
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    isCompany: false,
    cnpj: '',
    cpf: '',
    notes: ''
  });

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

  // ✅ NOVA FUNÇÃO: Salvar novo cliente
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCustomer: Customer = {
      id: `c${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...newCustomerData as any
    };
    
    try {
      // Salva no Firestore
      await setDoc(doc(db, "customers", newCustomer.id), newCustomer);
      
      // Atualiza a lista local
      setCustomers(prev => [...prev, newCustomer]);
      
      // Seleciona automaticamente o novo cliente
      setFormData({
        ...formData,
        customerId: newCustomer.id,
        eventAddress: newCustomer.address || ''
      });
      
      // Limpa o formulário e fecha o modal
      setNewCustomerData({
        name: '',
        phone: '',
        address: '',
        isCompany: false,
        cnpj: '',
        cpf: '',
        notes: ''
      });
      setIsNewCustomerModalOpen(false);
      
      alert('✅ Cliente adicionado e selecionado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('❌ Erro ao salvar o cliente. Tente novamente.');
    }
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
      width: element.style.width,
      transform: element.style.transform,
      zIndex: element.style.zIndex
    };
    
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '1200px';
    element.style.transform = 'scale(1)';
    element.style.zIndex = '-1';
    
    await new Promise(resolve => setTimeout(resolve, isMobile ? 500 : 100));
    
    try {
      const canvas = await (window as any).html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1200,
        height: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = (window as any).jspdf;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= pageHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;
        
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin);
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      pdf.save(filename);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      Object.assign(element.style, originalStyles);
      const loading = document.getElementById('pdf-loading');
      if (loading) loading.remove();
    }
  };

  const handleDownloadCalendarPDF = () => handleDownloadPDFUniversal('print-area-calendar', `agenda-${viewTab.toLowerCase()}-susu.pdf`);
  const handleDownloadListPDF = () => handleDownloadPDFUniversal('print-area-list', 'reservas-completas-susu.pdf');
  const handleCopyLink = (rental: Rental) => {
    const link = `${window.location.origin}/#/resumo/${rental.id}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado! Compartilhe com o cliente.');
  };

  const handleSendWhatsApp = (rental: Rental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    const link = `${window.location.origin}/#/resumo/${rental.id}`;
    const message = `Olá ${customer?.name}! Segue o link com o resumo da sua reserva: ${link}`;
    const encodedMessage = encodeURIComponent(message);
    const phone = customer?.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleCompleteEvent = (rental: Rental) => {
    if (!confirm(`Marcar evento como concluído?\nCliente: ${rental.customerName}`)) return;
    
    const updated = { ...rental, status: RentalStatus.COMPLETED };
    setRentals(prev => prev.map(r => r.id === rental.id ? updated : r));
  };

  const handleDeleteRental = async (rentalId: string) => {
    if (!confirm("⚠️ Deseja realmente excluir esta reserva?")) return;
    
    try {
      await deleteDoc(doc(db, "rentals", rentalId));
      setRentals(prev => prev.filter(r => r.id !== rentalId));
      alert("✅ Reserva excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir reserva:", error);
      alert("❌ Erro ao excluir a reserva. Tente novamente.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Selecione um cliente");
    if (!formData.toyIds || formData.toyIds.length === 0) return alert("Selecione pelo menos um brinquedo");

    const customer = customers.find(c => c.id === formData.customerId);
    
    if (editingRental) {
      const updated: Rental = {
        ...editingRental,
        ...formData,
        customerName: customer?.name || editingRental.customerName,
        customerPhone: customer?.phone || editingRental.customerPhone,
        id: editingRental.id
      };
      setRentals(prev => prev.map(r => r.id === editingRental.id ? updated : r));
    } else {
      const newRental: Rental = {
        id: `r${Date.now()}`,
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        ...formData as any
      };
      setRentals(prev => [...prev, newRental]);
    }
    setIsModalOpen(false);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthDays = useMemo(() => {
    const days = [];
    const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const startDay = startDayOfWeek(currentDate.getFullYear(), currentDate.getMonth());

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    
    return days;
  }, [currentDate]);

  const getRentalsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredRentals.filter(r => r.date === dateStr);
  };

  const monthsOfYear = useMemo(() => {
    return Array.from({length: 12}, (_, i) => {
      const monthStart = new Date(currentDate.getFullYear(), i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), i + 1, 0);
      return {
        month: i,
        name: monthStart.toLocaleString('pt-BR', { month: 'long' }),
        rentals: rentals.filter(r => {
          const rDate = new Date(r.date + 'T00:00:00');
          return rDate >= monthStart && rDate <= monthEnd;
        })
      };
    });
  }, [currentDate, rentals]);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Agenda de Eventos</h1>
          <p className="text-slate-500 font-medium">Organize todas as reservas e locações.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {viewTab !== 'Lista' && (
            <button 
              onClick={viewTab === 'Mês' ? handleDownloadCalendarPDF : handleDownloadCalendarPDF} 
              className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-3xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar Calendário
            </button>
          )}
          {viewTab === 'Lista' && (
            <button 
              onClick={handleDownloadListPDF} 
              className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-3xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar Lista
            </button>
          )}
          <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
            <Plus size={20} className="inline mr-2"/> Nova Reserva
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4 bg-white rounded-3xl p-2 border shadow-sm">
        <div className="flex gap-2">
          {(['Mês', 'Ano', 'Lista'] as const).map(tab => (
            <button key={tab} onClick={() => setViewTab(tab)} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-800'}`}>
              {tab === 'Mês' && <CalendarDays size={14} className="inline mr-2"/>}
              {tab === 'Ano' && <BarChart3 size={14} className="inline mr-2"/>}
              {tab === 'Lista' && <List size={14} className="inline mr-2"/>}
              {tab}
            </button>
          ))}
        </div>
        
        {viewTab !== 'Lista' && (
          <div className="flex items-center gap-3">
            <button onClick={() => changeTime(-1)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><ChevronLeft size={20}/></button>
            <span className="font-black text-slate-800 uppercase tracking-tight min-w-[150px] text-center">
              {viewTab === 'Mês' ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}
            </span>
            <button onClick={() => changeTime(1)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><ChevronRight size={20}/></button>
          </div>
        )}
      </div>

      {viewTab === 'Mês' && (
        <>
          <div id="print-area-calendar" style={{display: 'none'}} className="bg-white p-8">
            <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Calendário de Reservas</h1>
                <p className="text-base font-bold mt-2 uppercase tracking-widest opacity-60">
                  {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </p>
              </div>
              <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className="w-full h-full bg-slate-100"/>}
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center font-black text-sm uppercase tracking-widest border-b-2 border-slate-900">
                  {day}
                </div>
              ))}
              
              {monthDays.map((day, i) => {
                const dayRentals = day ? getRentalsForDay(day) : [];
                return (
                  <div key={i} className={`min-h-[120px] p-2 border ${day ? 'bg-white' : 'bg-slate-50'}`}>
                    {day && (
                      <>
                        <div className="font-black text-lg mb-2">{day}</div>
                        {dayRentals.map(rental => (
                          <div key={rental.id} className="text-xs p-1 mb-1 bg-slate-100 rounded">
                            <div className="font-bold truncate">{rental.customerName}</div>
                            <div className="opacity-60">{rental.startTime}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-900 text-white">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                <div key={day} className="p-4 text-center font-black text-[10px] uppercase tracking-widest border-r border-slate-700 last:border-0">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const dayRentals = day ? getRentalsForDay(day) : [];
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <div key={i} className={`min-h-[140px] p-3 border-r border-b border-slate-100 last:border-r-0 ${day ? 'bg-white hover:bg-slate-50/50 cursor-pointer transition-colors' : 'bg-slate-50/30'} ${isToday ? 'ring-2 ring-blue-600 ring-inset' : ''}`} onClick={() => day && handleOpenModal()}>
                    {day && (
                      <>
                        <div className={`font-black text-xl mb-2 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day}</div>
                        <div className="space-y-1">
                          {dayRentals.slice(0, 2).map(rental => {
                            const statusColors = {
                              [RentalStatus.PENDING]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                              [RentalStatus.CONFIRMED]: 'bg-blue-50 text-blue-700 border-blue-200',
                              [RentalStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              [RentalStatus.CANCELLED]: 'bg-red-50 text-red-700 border-red-200'
                            };
                            
                            return (
                              <div key={rental.id} className={`text-[10px] p-2 rounded-xl border ${statusColors[rental.status]} font-bold`}>
                                <div className="truncate uppercase tracking-tight">{rental.customerName}</div>
                                <div className="opacity-70 flex items-center gap-1 mt-1"><Clock size={10}/> {rental.startTime}</div>
                              </div>
                            );
                          })}
                          {dayRentals.length > 2 && (
                            <div className="text-[10px] text-center text-slate-400 font-black">+{dayRentals.length - 2} mais</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {viewTab === 'Ano' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monthsOfYear.map(({ month, name, rentals: monthRentals }) => (
            <div key={month} className="bg-white rounded-[32px] border overflow-hidden shadow-sm hover:shadow-lg transition-all">
              <div className="bg-slate-900 text-white p-6">
                <h3 className="font-black text-xl uppercase tracking-tight">{name}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{monthRentals.length} Reserva{monthRentals.length !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="p-6 space-y-3 max-h-[300px] overflow-y-auto">
                {monthRentals.length === 0 ? (
                  <p className="text-slate-300 text-center py-8 text-sm font-bold uppercase">Nenhuma reserva</p>
                ) : (
                  monthRentals.slice(0, 5).map(rental => (
                    <div key={rental.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{rental.customerName}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(rental.date + 'T00:00:00').getDate()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <Clock size={10}/> {rental.startTime} - {rental.endTime}
                      </div>
                    </div>
                  ))
                )}
                {monthRentals.length > 5 && (
                  <div className="text-center text-xs text-slate-400 font-black">+{monthRentals.length - 5} mais</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewTab === 'Lista' && (
          <>
              <div id="print-area-list" style={{display: 'none'}} className="bg-white p-8 text-slate-900">
                  <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-center">
                      <div>
                          <h1 className="text-3xl font-black uppercase tracking-tight">Listagem Completa de Reservas</h1>
                          <p className="text-base font-bold mt-2 uppercase tracking-widest opacity-60">SUSU Animações e Brinquedos</p>
                      </div>
                      <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                          {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className="w-full h-full bg-slate-100"/>}
                      </div>
                  </div>
                  
                  <table className="w-full text-base text-left border-collapse">
                      <thead>
                          <tr className="border-b-2 border-slate-900 uppercase font-black">
                              <th className="py-2 px-2">Data</th>
                              <th className="py-2 px-2">Cliente</th>
                              <th className="py-2 px-2">Horário</th>
                              <th className="py-2 px-2">Status</th>
                              <th className="py-2 px-2">Total (R$)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredRentals.map(rental => (
                              <tr key={rental.id}>
                                  <td className="py-2 px-2 font-black">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                  <td className="py-2 px-2 uppercase">{rental.customerName}</td>
                                  <td className="py-2 px-2">{rental.startTime} - {rental.endTime}</td>
                                  <td className="py-2 px-2 uppercase text-xs">{rental.status}</td>
                                  <td className="py-2 px-2 font-black">{rental.totalValue.toLocaleString('pt-BR')}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  
                  <div className="mt-6 border-t pt-3 text-xs font-black uppercase opacity-40 text-center">
                      Gerado por {user?.name} em {new Date().toLocaleDateString('pt-BR')}
                  </div>
              </div>

              <div className="space-y-4">
                  {filteredRentals.map(rental => {
                      const customer = customers.find(c => c.id === rental.customerId);
                      const rentalToys = toys.filter(t => rental.toyIds?.includes(t.id));
                      const pending = (rental.totalValue || 0) - (rental.entryValue || 0);
                      
                      const statusConfig = {
                          [RentalStatus.PENDING]: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Pendente' },
                          [RentalStatus.CONFIRMED]: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Confirmado' },
                          [RentalStatus.COMPLETED]: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Concluído' },
                          [RentalStatus.CANCELLED]: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Cancelado' }
                      };
                      const config = statusConfig[rental.status];

                      return (
                          <div key={rental.id} className={`bg-white rounded-[32px] border-2 ${config.border} overflow-hidden shadow-sm hover:shadow-lg transition-all`}>
                              <div className={`${config.bg} px-6 py-4 flex items-center justify-between border-b-2 ${config.border}`}>
                                  <div className="flex items-center gap-3">
                                      <CalendarIcon size={20} className={config.text}/>
                                      <span className="font-black text-sm uppercase tracking-tight text-slate-800">
                                          {new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                      </span>
                                  </div>
                                  <span className={`px-4 py-2 ${config.bg} ${config.text} rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 ${config.border}`}>
                                      {config.label}
                                  </span>
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
                  })}
              </div>
          </>
      )}

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
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                              <span>Cliente</span>
                              <button
                                  type="button"
                                  onClick={() => setIsNewCustomerModalOpen(true)}
                                  className="text-blue-600 hover:text-blue-700 font-black text-xs flex items-center gap-1 hover:underline"
                              >
                                  <UserPlus size={14} /> Novo Cliente
                              </button>
                          </label>
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
                          <select required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}>
                              <option value={RentalStatus.PENDING}>Pendente</option>
                              <option value={RentalStatus.CONFIRMED}>Confirmado</option>
                              <option value={RentalStatus.COMPLETED}>Concluído</option>
                              <option value={RentalStatus.CANCELLED}>Cancelado</option>
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
                                                      setToyQuantities({...toyQuantities, [toy.id]: 1});
                                                  } else {
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

      {/* ✅ MODAL DE NOVO CLIENTE */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSaveNewCustomer} className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Novo Cliente</h3>
              <button 
                type="button" 
                onClick={() => setIsNewCustomerModalOpen(false)} 
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"
              >
                <X size={20}/>
              </button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${!newCustomerData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                <input 
                  type="radio" 
                  className="hidden" 
                  checked={!newCustomerData.isCompany} 
                  onChange={() => setNewCustomerData({...newCustomerData, isCompany: false})} 
                /> 
                Pessoa Física
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${newCustomerData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                <input 
                  type="radio" 
                  className="hidden" 
                  checked={newCustomerData.isCompany} 
                  onChange={() => setNewCustomerData({...newCustomerData, isCompany: true})} 
                /> 
                Empresa (PJ)
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nome / Razão Social *
                </label>
                <input 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={newCustomerData.name} 
                  onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} 
                  placeholder="Digite o nome completo"
                />
              </div>
              
              {newCustomerData.isCompany ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newCustomerData.cnpj} 
                    onChange={e => setNewCustomerData({...newCustomerData, cnpj: e.target.value})} 
                    placeholder="00.000.000/0001-00" 
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newCustomerData.cpf} 
                    onChange={e => setNewCustomerData({...newCustomerData, cpf: e.target.value})} 
                    placeholder="000.000.000-00" 
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp *</label>
                <input 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={newCustomerData.phone} 
                  onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} 
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Principal *</label>
                <textarea 
                  required 
                  rows={2} 
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold resize-none outline-none focus:ring-2 focus:ring-blue-500/20" 
                  value={newCustomerData.address} 
                  onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} 
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all"
            >
              ✨ Salvar e Selecionar Cliente
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Rentals;
