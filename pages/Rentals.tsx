import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Building2, Users } from 'lucide-react';
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
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

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
    setIsAddingCustomer(false);
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
      alert("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      Object.assign(element.style, originalStyles);
      const loading = document.getElementById('pdf-loading');
      if (loading) loading.remove();
    }
  };

  const handleAddNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = { 
      id: `c${Date.now()}`, 
      createdAt: new Date().toISOString(), 
      ...(newCustomerData as any) 
    };
    setCustomers(prev => [...prev, newCustomer]);
    setFormData(prev => ({ ...prev, customerId: newCustomer.id }));
    setIsAddingCustomer(false);
    setNewCustomerData({ name: '', phone: '', address: '', isCompany: false, cnpj: '', cpf: '', notes: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRental) {
      setRentals(prev => prev.map(r => r.id === editingRental.id ? { ...r, ...formData } as Rental : r));
    } else {
      const newR: Rental = { 
        id: `r${Date.now()}`, 
        createdAt: new Date().toISOString(), 
        ...(formData as any) 
      };
      setRentals(prev => [...prev, newR]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta reserva?")) return;
    
    try {
      await deleteDoc(doc(db, "rentals", id));
      setRentals(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao excluir reserva:", error);
      alert("Erro ao excluir a reserva. Tente novamente.");
    }
  };

  const handleShareRental = async (rental: Rental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    const selectedToys = toys.filter(t => rental.toyIds?.includes(t.id));
    
    const message = `🎉 *CONFIRMAÇÃO DE RESERVA*\n\n` +
      `📅 *Data:* ${new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}\n` +
      `⏰ *Horário:* ${rental.startTime} às ${rental.endTime}\n` +
      `📍 *Local:* ${rental.eventAddress}\n\n` +
      `🎪 *Brinquedos Reservados:*\n${selectedToys.map(t => `• ${t.name}`).join('\n')}\n\n` +
      `💰 *Valor Total:* R$ ${rental.totalValue?.toFixed(2)}\n` +
      `✅ *Entrada Paga:* R$ ${rental.entryValue?.toFixed(2)}\n` +
      `💳 *Forma de Pagamento:* ${rental.paymentMethod}\n\n` +
      `Acesse o resumo completo: ${window.location.origin}/#/resumo/${rental.id}`;
    
    const phoneNumber = customer?.phone?.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getRentalStatusBadge = (status: RentalStatus) => {
    switch(status) {
      case RentalStatus.PENDING: return <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-2xl text-[10px] font-black uppercase tracking-wider">Pendente</span>;
      case RentalStatus.CONFIRMED: return <span className="px-4 py-2 bg-green-100 text-green-700 rounded-2xl text-[10px] font-black uppercase tracking-wider">Confirmada</span>;
      case RentalStatus.COMPLETED: return <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-wider">Concluída</span>;
      case RentalStatus.CANCELLED: return <span className="px-4 py-2 bg-red-100 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-wider">Cancelada</span>;
    }
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Reservas de Brinquedos</h1>
            <p className="text-slate-500 font-medium">Controle completo de aluguel de itens.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
                <Plus size={20} className="inline mr-2"/> Nova Reserva
            </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white rounded-3xl border p-2 flex gap-2 shadow-sm">
            <button onClick={() => setViewTab('Mês')} className={`flex-1 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewTab === 'Mês' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                <CalendarIcon size={16} className="inline mr-2"/> Mês
            </button>
            <button onClick={() => setViewTab('Ano')} className={`flex-1 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewTab === 'Ano' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                <CalendarDays size={16} className="inline mr-2"/> Ano
            </button>
            <button onClick={() => setViewTab('Lista')} className={`flex-1 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewTab === 'Lista' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                <List size={16} className="inline mr-2"/> Lista
            </button>
        </div>

        {viewTab !== 'Lista' && (
            <div className="bg-white rounded-3xl border p-2 flex items-center gap-4 shadow-sm">
                <button onClick={() => changeTime(-1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-600"><ChevronLeft size={20}/></button>
                <p className="font-black text-sm uppercase tracking-widest text-slate-700 min-w-[180px] text-center">{monthName}</p>
                <button onClick={() => changeTime(1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-600"><ChevronRight size={20}/></button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-[40px] p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-2">Total de Reservas</p>
                    <p className="text-5xl font-black">{filteredRentals.length}</p>
                </div>
                <div className="p-5 bg-white/20 rounded-3xl"><BarChart3 size={32}/></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-[40px] p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-yellow-100 text-[10px] font-black uppercase tracking-widest mb-2">Pendentes</p>
                    <p className="text-5xl font-black">{filteredRentals.filter(r => r.status === RentalStatus.PENDING).length}</p>
                </div>
                <div className="p-5 bg-white/20 rounded-3xl"><Clock size={32}/></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-[40px] p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-green-100 text-[10px] font-black uppercase tracking-widest mb-2">Confirmadas</p>
                    <p className="text-5xl font-black">{filteredRentals.filter(r => r.status === RentalStatus.CONFIRMED).length}</p>
                </div>
                <div className="p-5 bg-white/20 rounded-3xl"><CheckCircle2 size={32}/></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-[40px] p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-purple-100 text-[10px] font-black uppercase tracking-widest mb-2">Concluídas</p>
                    <p className="text-5xl font-black">{filteredRentals.filter(r => r.status === RentalStatus.COMPLETED).length}</p>
                </div>
                <div className="p-5 bg-white/20 rounded-3xl"><CalendarIcon size={32}/></div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <tr>
                <th className="px-10 py-5">Cliente</th>
                <th className="px-8 py-5">Data do Evento</th>
                <th className="px-8 py-5">Horário</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredRentals.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-10 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-slate-50 rounded-3xl"><CalendarIcon size={48} className="text-slate-300"/></div>
                            <div>
                                <p className="font-black text-slate-800 text-lg">Nenhuma reserva encontrada</p>
                                <p className="text-slate-400 text-sm">Crie uma nova reserva para começar</p>
                            </div>
                        </div>
                    </td>
                </tr>
            ) : (
                filteredRentals.map(rental => {
                    const customer = customers.find(c => c.id === rental.customerId);
                    const selectedToys = toys.filter(t => rental.toyIds?.includes(t.id));
                    
                    return (
                        <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-10 py-6">
                                <div>
                                    <p className="font-black text-slate-800 uppercase tracking-tight">{customer?.name || 'Cliente não encontrado'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2 mt-1">
                                        <Phone size={10}/> {customer?.phone}
                                    </p>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <p className="font-black text-slate-700">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1"><MapPin size={10}/> {rental.eventAddress?.substring(0, 30)}...</p>
                            </td>
                            <td className="px-8 py-6">
                                <p className="font-black text-slate-600">{rental.startTime} - {rental.endTime}</p>
                            </td>
                            <td className="px-8 py-6">
                                {getRentalStatusBadge(rental.status)}
                            </td>
                            <td className="px-8 py-6">
                                <p className="font-black text-emerald-600 text-lg">R$ {rental.totalValue?.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Entrada: R$ {rental.entryValue?.toFixed(2)}</p>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleDownloadPDFUniversal(`print-area-${rental.id}`, `resumo-reserva-${rental.id}.pdf`)} className="p-3 bg-slate-100 text-slate-500 hover:bg-purple-600 hover:text-white rounded-2xl transition-all" title="Baixar PDF"><Download size={16}/></button>
                                    <button onClick={() => handleShareRental(rental)} className="p-3 bg-slate-100 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all" title="Compartilhar no WhatsApp"><MessageCircle size={16}/></button>
                                    <button onClick={() => handleOpenModal(rental)} className="p-3 bg-slate-100 text-blue-500 hover:bg-blue-600 hover:text-white rounded-2xl transition-all" title="Editar"><Edit3 size={16}/></button>
                                    <button onClick={() => handleDelete(rental.id)} className="p-3 bg-slate-100 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all" title="Excluir"><Trash2 size={16}/></button>
                                </div>
                            </td>

                            {/* ÁREA DE IMPRESSÃO INVISÍVEL */}
                            <div id={`print-area-${rental.id}`} style={{ display: 'none' }} className="bg-white p-8 text-slate-900">
                                <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-center">
                                    <div>
                                        <h1 className="text-3xl font-black uppercase tracking-tight">Resumo da Reserva</h1>
                                        <p className="text-base font-bold mt-2 uppercase tracking-widest opacity-60">SUSU Animações e Brinquedos</p>
                                    </div>
                                    <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                                        {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo" /> : <div className="w-full h-full bg-slate-100"/>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Cliente</p>
                                        <p className="text-xl font-black">{customer?.name}</p>
                                        <p className="text-sm font-bold mt-1">{customer?.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Data e Horário</p>
                                        <p className="text-xl font-black">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        <p className="text-sm font-bold mt-1">{rental.startTime} às {rental.endTime}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Local do Evento</p>
                                    <p className="text-base font-bold">{rental.eventAddress}</p>
                                </div>

                                <div className="mb-6">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-3">Brinquedos Reservados</p>
                                    <div className="space-y-2">
                                        {selectedToys.map(toy => (
                                            <div key={toy.id} className="flex justify-between items-center border-b pb-2">
                                                <span className="font-black">{toy.name}</span>
                                                <span className="font-bold">R$ {toy.price?.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {rental.additionalService && (
                                    <div className="mb-6">
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Serviço Adicional</p>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black">{rental.additionalService}</span>
                                            <span className="font-bold">R$ {rental.additionalServiceValue?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t-2 border-slate-900 pt-4 mt-6">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Valor Total</p>
                                            <p className="text-2xl font-black">R$ {rental.totalValue?.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Entrada Paga</p>
                                            <p className="text-2xl font-black text-emerald-600">R$ {rental.entryValue?.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Saldo Restante</p>
                                            <p className="text-2xl font-black text-orange-600">R$ {((rental.totalValue || 0) - (rental.entryValue || 0)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 border-t pt-3 text-xs font-black uppercase opacity-40 text-center">
                                    Gerado por {user?.name} em {new Date().toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </tr>
                    );
                })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="bg-white w-full max-w-6xl rounded-[40px] p-10 space-y-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                      <button type="button" onClick={()=>setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={24}/></button>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 text-blue-700">
                          <UserPlus size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Informações do Cliente</h3>
                      </div>
                      
                      {!isAddingCustomer ? (
                          <div className="space-y-3">
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Selecionar Cliente</label>
                                  <select required className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                                      <option value="">Escolha um cliente...</option>
                                      {customers.map(c => (
                                          <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                                      ))}
                                  </select>
                              </div>
                              <button 
                                  type="button" 
                                  onClick={() => setIsAddingCustomer(true)}
                                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                              >
                                  <Plus size={18} /> Adicionar Novo Cliente
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-4 p-4 bg-white rounded-2xl border-2 border-blue-200">
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

                              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                  <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${!newCustomerData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                                      <input type="radio" className="hidden" checked={!newCustomerData.isCompany} onChange={()=>setNewCustomerData({...newCustomerData, isCompany: false})} /> Pessoa Física
                                  </label>
                                  <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${newCustomerData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                                      <input type="radio" className="hidden" checked={newCustomerData.isCompany} onChange={()=>setNewCustomerData({...newCustomerData, isCompany: true})} /> Empresa (PJ)
                                  </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                                      <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={newCustomerData.name} onChange={e=>setNewCustomerData({...newCustomerData, name: e.target.value})} />
                                  </div>

                                  {newCustomerData.isCompany ? (
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                                          <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={newCustomerData.cnpj} onChange={e=>setNewCustomerData({...newCustomerData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                                      </div>
                                  ) : (
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                                          <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={newCustomerData.cpf} onChange={e=>setNewCustomerData({...newCustomerData, cpf: e.target.value})} placeholder="000.000.000-00" />
                                      </div>
                                  )}

                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                      <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={newCustomerData.phone} onChange={e=>setNewCustomerData({...newCustomerData, phone: e.target.value})} />
                                  </div>

                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Principal</label>
                                      <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={newCustomerData.address} onChange={e=>setNewCustomerData({...newCustomerData, address: e.target.value})} />
                                  </div>
                              </div>

                              <button 
                                  type="button"
                                  onClick={handleAddNewCustomer}
                                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                              >
                                  ✓ Salvar e Selecionar Cliente
                              </button>
                          </div>
                      )}
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                          <CalendarIcon size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Detalhes do Evento</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Data do Evento</label>
                              <input type="date" required className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                          </div>

                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Hora de Início</label>
                              <input type="time" required className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                          </div>

                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Hora de Término</label>
                              <input type="time" required className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Endereço do Evento</label>
                          <textarea required rows={2} className="w-full px-6 py-4 bg-white rounded-2xl font-bold resize-none border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.eventAddress} onChange={e => setFormData({...formData, eventAddress: e.target.value})} placeholder="Rua, número, bairro, cidade..." />
                      </div>

                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Status da Reserva</label>
                          <select className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}>
                              <option value={RentalStatus.PENDING}>Pendente</option>
                              <option value={RentalStatus.CONFIRMED}>Confirmada</option>
                              <option value={RentalStatus.COMPLETED}>Concluída</option>
                              <option value={RentalStatus.CANCELLED}>Cancelada</option>
                          </select>
                      </div>
                  </div>

                  <div className="p-6 bg-orange-50 rounded-3xl border-2 border-orange-100 space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-orange-700">
                              <ClipboardList size={20} />
                              <h3 className="font-black text-sm uppercase tracking-widest">Brinquedos Selecionados</h3>
                          </div>
                          <div className="flex gap-2">
                              {categories.map(cat => (
                                  <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setSelectedCategory(cat)}
                                      className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 hover:bg-orange-100'}`}
                                  >
                                      {cat}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
                          {filteredToys.length === 0 ? (
                              <div className="col-span-full text-center py-8">
                                  <p className="text-slate-400 font-bold">Nenhum brinquedo cadastrado</p>
                              </div>
                          ) : (
                              filteredToys.map(toy => {
                                  const isSelected = formData.toyIds?.includes(toy.id);
                                  const quantity = toyQuantities[toy.id] || 1;
                                  
                                  return (
                                      <div key={toy.id} className={`rounded-3xl overflow-hidden border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-600' : 'border-slate-200 bg-white hover:border-orange-300'}`}>
                                          <label className={`flex items-start gap-4 p-4 cursor-pointer ${isSelected ? 'text-white' : ''}`}>
                                              <input 
                                                  type="checkbox" 
                                                  className="hidden"
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
                                                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                                                      <img src={toy.imageUrl} alt={toy.name} className="w-full h-full object-cover" />
                                                  </div>
                                              )}
                                              
                                              <div className="flex-1">
                                                  <p className={'font-black text-sm mb-1 ' + (isSelected ? 'text-white' : 'text-slate-800')}>{toy.name}</p>
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
                                          <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-orange-500/20 pt-3 mt-1">
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
                                                      className="w-16 h-8 rounded-lg bg-white text-orange-600 text-center font-black text-sm border-0 outline-none"
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
