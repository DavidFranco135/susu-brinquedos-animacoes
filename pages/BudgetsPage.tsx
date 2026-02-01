
import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, X, Plus, CheckCircle, Edit3, MessageCircle } from 'lucide-react';
import { Rental, Toy, Customer, CompanySettings, RentalStatus, PaymentMethod, User } from '../types';

interface Props {
  rentals: Rental[];
  setRentals?: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  toys: Toy[];
  company: CompanySettings;
}

const BudgetsPage: React.FC<Props> = ({ rentals, customers, toys, company, setRentals }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Rental | null>(null);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  
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
  
  // Detecta se é mobile
  const isMobile = window.innerWidth < 768;
  
  // Mostra loading
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'pdf-loading';
  loadingDiv.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center';
  loadingDiv.innerHTML = `
    <div class="bg-white rounded-3xl p-8 text-center space-y-4">
      <div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="font-black text-slate-800 text-sm uppercase tracking-widest">Gerando PDF...</p>
      <p class="text-xs text-slate-400">Isso pode levar alguns segundos</p>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  
  // Salva estilos originais
  const originalStyles = {
    display: element.style.display,
    position: element.style.position,
    left: element.style.left,
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    transform: element.style.transform,
    overflow: element.style.overflow
  };
  
  // Prepara elemento para renderização
  element.classList.remove('hidden');
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.width = '794px'; // Largura A4 em pixels (210mm)
  element.style.maxWidth = '794px';
  element.style.transform = 'scale(1)';
  element.style.overflow = 'visible';
  
  // Aguarda fontes e imagens carregarem
  await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 500));
  
  const { jsPDF } = (window as any).jspdf;
  
  try {
    const canvas = await (window as any).html2canvas(element, { 
      scale: isMobile ? 2 : 3, // Menor scale no mobile para economizar memória
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
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Remove elementos que podem causar problemas
          clonedElement.querySelectorAll('button, .no-print').forEach(el => el.remove());
          
          // Ajusta fontes para melhor renderização
          clonedElement.style.fontSmoothing = 'antialiased';
          clonedElement.style.webkitFontSmoothing = 'antialiased';
          
          // Garante que textos não quebrem incorretamente
          const textElements = clonedElement.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
          textElements.forEach(el => {
            (el as HTMLElement).style.wordBreak = 'normal';
            (el as HTMLElement).style.overflowWrap = 'normal';
            (el as HTMLElement).style.whiteSpace = 'normal';
          });
        }
      }
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG com qualidade 95% (menor tamanho)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    // Adiciona primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
    
    // Adiciona páginas extras se necessário
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
    
    // Salva o PDF
    if (isMobile) {
      // No mobile, abre em nova aba para facilitar download
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      pdf.save(`${filename}.pdf`);
    }
    
    // Feedback de sucesso
    loadingDiv.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center space-y-4">
        <div class="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p class="font-black text-slate-800 text-sm uppercase tracking-widest">PDF Gerado!</p>
      </div>
    `;
    
    setTimeout(() => loadingDiv.remove(), 1500);
    
  } catch (err) {
    console.error("PDF Error:", err);
    
    // Mostra erro amigável
    loadingDiv.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center space-y-4 max-w-sm">
        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <p class="font-black text-slate-800 text-sm uppercase tracking-widest">Erro ao gerar PDF</p>
        <p class="text-xs text-slate-400">Tente novamente ou use um navegador diferente</p>
        <button onclick="document.getElementById('pdf-loading').remove()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase">
          Fechar
        </button>
      </div>
    `;
    
  } finally {
    // Restaura estilos originais
    Object.keys(originalStyles).forEach(key => {
      element.style[key] = originalStyles[key];
    });
    
    if (element.classList.contains('hidden')) {
      element.classList.add('hidden');
    }
  }
};


  const handleSendWhatsApp = (budget: Rental) => {
    const customer = customers.find(c => c.id === budget.customerId);
    if (!customer?.phone) return alert("Cliente sem telefone cadastrado.");
    
    const toysNames = toys.filter(t => budget.toyIds.includes(t.id)).map(t => `${t.name} (${t.size || 'Unico'})`).join(', ');
    const formattedDate = new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR');

    const text = encodeURIComponent(
      `✨ *ORÇAMENTO PERSONALIZADO - SUSU ANIMAÇÕES*\n\n` +
      `Olá, *${budget.customerName}*! Tudo bem?\n` +
      `Conforme conversamos, segue a proposta para o seu evento:\n\n` +
      `📅 *Data Prevista:* ${formattedDate}\n` +
      `⏰ *Horário:* ${budget.startTime} às ${budget.endTime}\n` +
      `🎮 *Brinquedos:* ${toysNames}\n\n` +
      `💰 *Valor Total do Investimento:* *R$ ${budget.totalValue.toLocaleString('pt-BR')}*\n` +
      `💳 *Sinal de Reserva:* R$ ${budget.entryValue.toLocaleString('pt-BR')}\n\n` +
      `Esta proposta é válida por 10 dias. Podemos garantir a sua data? 😊`
    );

    const cleanPhone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  const handleOpenModal = (budget?: Rental) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData(budget);
    } else {
      setEditingBudget(null);
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
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !setRentals) return alert("Selecione um cliente");
    
    const customer = customers.find(c => c.id === formData.customerId);
    const budgetData: Rental = {
      id: editingBudget?.id || `b${Date.now()}`,
      customerId: formData.customerId!,
      customerName: customer?.name || 'Cliente',
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      toyIds: formData.toyIds || [],
      totalValue: formData.totalValue || 0,
      entryValue: Number(formData.entryValue) || 0,
      paymentMethod: formData.paymentMethod as PaymentMethod,
      status: RentalStatus.PENDING
    };

    if (editingBudget) {
      setRentals(prev => prev.map(r => r.id === editingBudget.id ? budgetData : r));
    } else {
      setRentals(prev => [...prev, budgetData]);
    }
    
    setIsModalOpen(false);
    setSelectedRental(budgetData);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Propostas de Orçamento</h1>
          <p className="text-slate-500 font-medium">Gere propostas comerciais em PDF de alto padrão.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
          <Plus size={20} strokeWidth={3} /> Nova Proposta
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:hidden">
        {rentals.filter(r => r.status === RentalStatus.PENDING).map(r => (
          <div key={r.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><FileText size={26}/></div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">ID: {r.id.slice(-6)}</span>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 mb-1">{r.customerName}</h3>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider"><Calendar size={14}/> {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="border-t border-slate-50 pt-8 mb-8 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atrações Inclusas</p>
              <div className="flex flex-wrap gap-2">
                {r.toyIds.map(tid => {
                   const toy = toys.find(t=>t.id===tid);
                   return (
                    <span key={tid} className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-tighter">
                      {toy?.name} {toy?.size ? `(${toy.size})` : ''}
                    </span>
                   )
                })}
              </div>
            </div>

            <div className="flex justify-between items-center font-black text-slate-900 bg-slate-50 p-6 rounded-[32px] mb-8">
              <span className="text-xs uppercase tracking-widest text-slate-400">Total</span>
              <span className="text-xl">R$ {(r.totalValue || 0).toLocaleString('pt-BR')}</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSelectedRental(r)} className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95">
                  <Download size={16}/> Ver PDF
                </button>
                <button onClick={() => handleSendWhatsApp(r)} className="flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100">
                  <MessageCircle size={16}/> Enviar Whats
                </button>
              </div>
              <button onClick={() => handleOpenModal(r)} className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 w-full">
                <Edit3 size={16}/> Editar Orçamento
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedRental && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[400] flex items-center justify-center p-4 print:p-0">
          <div className="bg-white w-full max-w-4xl h-[95vh] print:h-auto rounded-[50px] print:rounded-none overflow-hidden flex flex-col print:block shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 print:hidden">
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Documento Comercial</h2>
              <button onClick={() => setSelectedRental(null)} className="p-4 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-16 md:p-24 bg-white text-slate-800" id="budget-print-area">
               <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-900 pb-12 gap-10">
                  <div className="space-y-4">
                    <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-slate-900 mb-4">
                        {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Proposta de<br/>Locação</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Válido por 10 dias úteis</p>
                  </div>
                  <div className="md:text-right space-y-2 pt-4">
                    <p className="font-black text-slate-900 text-xl">{company.name}</p>
                    <p className="text-xs font-bold text-slate-500 max-w-[300px] md:ml-auto leading-relaxed">{company.address}</p>
                    <p className="text-sm font-black text-blue-600">{company.phone} • {company.email}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-12">
                  <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cliente Solicitante</p>
                    <p className="font-black text-2xl text-slate-900 mb-2">{selectedRental.customerName}</p>
                    <p className="text-sm text-slate-500 font-medium">Orçamento personalizado para seu evento.</p>
                  </div>
                  <div className="p-8 bg-blue-50/50 rounded-[40px] border border-blue-100/50">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Data Estimada</p>
                    <p className="font-black text-2xl text-slate-900 mb-2">{new Date(selectedRental.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-slate-500 font-black uppercase tracking-tighter">{selectedRental.startTime}h às {selectedRental.endTime}h</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-3 tracking-widest">Especificação de Itens</p>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <th className="py-4">Descrição Atração (Tamanho)</th>
                        <th className="py-4">Período</th>
                        <th className="py-4 text-right">Investimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {selectedRental.toyIds.map(tid => {
                        const toy = toys.find(t=>t.id===tid);
                        return (
                          <tr key={tid}>
                            <td className="py-6 font-black text-slate-900">{toy?.name} {toy?.size ? `(${toy.size})` : ''}</td>
                            <td className="py-6 text-xs font-bold text-slate-400 uppercase">Período de Festa (4h)</td>
                            <td className="py-6 text-right text-slate-900 font-black">R$ {(toy?.price || 0).toLocaleString('pt-BR')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>

               <div className="mt-16 bg-slate-900 p-12 rounded-[50px] flex flex-col md:flex-row justify-between items-center text-white gap-10">
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[4px] mb-2">Total da Proposta</p>
                    <p className="text-6xl font-black">R$ {(selectedRental.totalValue || 0).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 text-center md:text-left min-w-[280px]">
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-2">Formas de Pagamento</p>
                    <p className="text-xs font-medium leading-relaxed opacity-80">Sinal de reserva: <strong>R$ {(selectedRental.entryValue || 0).toLocaleString('pt-BR')}</strong>. O restante deve ser liquidado na montagem dos brinquedos.</p>
                  </div>
               </div>
            </div>

            <div className="p-10 bg-slate-50 border-t flex justify-end gap-4 print:hidden">
              <button onClick={() => handleDownloadPDF('budget-print-area', `proposta-${selectedRental.customerName}`)} className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                <Download size={20}/> Baixar Proposta (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
             <form onSubmit={handleSaveBudget} className="bg-white w-full max-xl rounded-[40px] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
                    <button type="button" onClick={()=>setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all hover:text-slate-800"><X/></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Cliente interessado</label>
                        <select required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-sm border-0" value={formData.customerId} onChange={e=>setFormData({...formData, customerId: e.target.value})}>
                            <option value="">Escolha um cliente cadastrado</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Data sugerida</label>
                            <input type="date" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-sm border-0" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Sinal sugerido (R$)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              className="w-full px-6 py-4 bg-emerald-50 rounded-2xl font-black text-sm border-0 text-emerald-700" 
                              value={formData.entryValue === 0 ? '' : formData.entryValue} 
                              onChange={e => setFormData({...formData, entryValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                              placeholder="0,00"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Escolha as atrações</label>
                        <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
                            {toys.map(t => (
                                <label key={t.id} className={`flex items-center gap-4 cursor-pointer p-3 rounded-2xl transition-all ${formData.toyIds?.includes(t.id) ? 'bg-white border-blue-500 shadow-sm' : 'hover:bg-white'}`}>
                                    <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" checked={formData.toyIds?.includes(t.id)} onChange={e => {
                                        const current = formData.toyIds || [];
                                        const next = e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id);
                                        setFormData({...formData, toyIds: next});
                                    }} />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-700">{t.name}</span>
                                      <span className="text-[10px] font-bold text-slate-400">R$ {t.price.toLocaleString('pt-BR')} | Tam: {t.size || 'Unico'}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[32px] flex justify-between items-center text-white">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total do Orçamento</span>
                        <span className="text-2xl font-black">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <CheckCircle size={18}/> {editingBudget ? 'Atualizar Proposta' : 'Gerar Proposta Comercial'}
                    </button>
                </div>
             </form>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
