import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { db } from '../firebase';
import { deleteDoc, doc } from "firebase/firestore";

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  toys: Toy[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, toys }) => {
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

  // ✅ FUNÇÃO DE DELETE CORRIGIDA
  const handleDeleteRental = async (id: string) => {
    if (!confirm("Tem certeza que deseja APAGAR esta reserva permanentemente? Esta ação não pode ser desfeita.")) return;
    
    try {
      await deleteDoc(doc(db, "rentals", id));
      setRentals(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao excluir reserva:", error);
      alert("Erro ao excluir a reserva. Tente novamente.");
    }
  };

  const handleSendWhatsApp = (rental: Rental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer?.phone) return alert("Cliente sem telefone cadastrado.");
    
    const toysNames = toys.filter(t => rental.toyIds.includes(t.id)).map(t => t.name + ' (' + (t.size || 'Único') + ')').join(', ');
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
      return alert("⚠️ ATENÇÃO! Os seguintes brinquedos já estão totalmente reservados para esta data:\n\n" + toysBlocked.join(', ') + "\n\nEscolha outros brinquedos ou outra data.");
    }

    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) return alert("Cliente inválido");

    if (editingRental) {
      setRentals(prev => prev.map(r => r.id === editingRental.id ? { ...r, ...formData, customerName: customer.name } as Rental : r));
    } else {
      const newRental: Rental = {
        id: `rental_${Date.now()}`,
        createdAt: new Date().toISOString(),
        customerName: customer.name,
        ...(formData as any)
      };
      setRentals(prev => [...prev, newRental]);
    }
    setIsModalOpen(false);
  };

  const getStatusColor = (status: RentalStatus) => {
    switch (status) {
      case RentalStatus.PENDING: return 'bg-amber-500';
      case RentalStatus.CONFIRMED: return 'bg-blue-500';
      case RentalStatus.COMPLETED: return 'bg-emerald-500';
      case RentalStatus.CANCELLED: return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Gestão de Reservas</h1>
          <p className="text-slate-500 font-medium">Controle completo de agendamentos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
          <Plus size={20} className="inline mr-2"/> Nova Reserva
        </button>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {(['Mês', 'Ano', 'Lista'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                viewTab === tab
                  ? 'bg-blue-600 text-white shadow-xl'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {viewTab !== 'Lista' && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
            <button onClick={() => changeTime(-1)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-black text-slate-800">
              {viewTab === 'Mês' 
                ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                : currentDate.getFullYear()
              }
            </h2>
            <button onClick={() => changeTime(1)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <tr>
              <th className="px-10 py-5">Cliente / Evento</th>
              <th className="px-8 py-5">Data & Hora</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5">Valor</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredRentals.map(rental => {
              const customer = customers.find(c => c.id === rental.customerId);
              return (
                <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">{rental.customerName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{rental.eventAddress}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs">
                      <p className="font-black text-slate-700">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-slate-400 font-bold">{rental.startTime} - {rental.endTime}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white ${getStatusColor(rental.status)}`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-800">R$ {rental.totalValue.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Sinal: R$ {rental.entryValue.toFixed(2)}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(rental)} className="p-3 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-2xl transition-all" title="Editar">
                        <Edit3 size={16}/>
                      </button>
                      {rental.status === RentalStatus.CONFIRMED && (
                        <button onClick={() => handleCompleteEvent(rental)} className="p-3 bg-slate-100 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all" title="Concluir">
                          <CheckCircle2 size={16}/>
                        </button>
                      )}
                      <button onClick={() => handleSendWhatsApp(rental)} className="p-3 bg-slate-100 text-green-500 hover:bg-green-600 hover:text-white rounded-2xl transition-all" title="WhatsApp">
                        <MessageCircle size={16}/>
                      </button>
                      <button onClick={() => handleCopyLink(rental)} className="p-3 bg-slate-100 text-purple-500 hover:bg-purple-600 hover:text-white rounded-2xl transition-all" title="Compartilhar">
                        <Share2 size={16}/>
                      </button>
                      <button onClick={() => handleDeleteRental(rental.id)} className="p-3 bg-slate-100 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all" title="Excluir">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-4xl rounded-[40px] p-10 space-y-8 shadow-2xl my-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all">
                <X size={24}/>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                <select 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={formData.customerId || ''} 
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}
                >
                  <option value={RentalStatus.PENDING}>Pendente</option>
                  <option value={RentalStatus.CONFIRMED}>Confirmado</option>
                  <option value={RentalStatus.COMPLETED}>Concluído</option>
                  <option value={RentalStatus.CANCELLED}>Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                <input 
                  type="date" 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                <input 
                  type="time" 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={formData.startTime} 
                  onChange={e => setFormData({...formData, startTime: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                <input 
                  type="time" 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  value={formData.endTime} 
                  onChange={e => setFormData({...formData, endTime: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço do Evento</label>
              <textarea 
                required 
                rows={2} 
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" 
                value={formData.eventAddress} 
                onChange={e => setFormData({...formData, eventAddress: e.target.value})} 
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-widest text-blue-700">Brinquedos</h3>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/50 text-blue-400 hover:bg-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredToys.length === 0 ? (
                  <p className="col-span-full text-center text-blue-400 py-8">Nenhum brinquedo disponível</p>
                ) : (
                  filteredToys.map(toy => {
                    const isSelected = formData.toyIds?.includes(toy.id) || false;
                    const quantity = toyQuantities[toy.id] || 1;
                    
                    return (
                      <div key={toy.id} className={`rounded-2xl overflow-hidden border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                        <label className="flex items-center gap-4 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => {
                              const newToyIds = isSelected
                                ? formData.toyIds?.filter(id => id !== toy.id)
                                : [...(formData.toyIds || []), toy.id];
                              setFormData({...formData, toyIds: newToyIds});
                              
                              if (!isSelected) {
                                setToyQuantities({...toyQuantities, [toy.id]: 1});
                              } else {
                                const newQty = {...toyQuantities};
                                delete newQty[toy.id];
                                setToyQuantities(newQty);
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={'font-black text-sm mb-1 uppercase tracking-tight ' + (isSelected ? 'text-white' : 'text-slate-800')}>{toy.name}</p>
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
