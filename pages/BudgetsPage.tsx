import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, X, Plus, CheckCircle, Edit3, MessageCircle, Loader2 } from 'lucide-react';
import { Rental, Toy, Customer, CompanySettings, RentalStatus, PaymentMethod, User } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Referência para capturar o HTML do PDF
  const budgetRef = useRef<HTMLDivElement>(null);

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
    const total = selectedToys.reduce((acc, t) => acc + t.price, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.toyIds, toys]);

  // FUNÇÃO DE GERAÇÃO DE PDF A4
  const generatePDF = async () => {
    if (!budgetRef.current) return;
    
    setIsGenerating(true);
    try {
      const element = budgetRef.current;
      
      // Captura o HTML como imagem (Canvas)
      const canvas = await html2canvas(element, {
        scale: 2, // Melhora a nitidez dos textos
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794, // Largura padrão A4 em pixels (96 DPI)
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Cria o PDF no formato A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${selectedRental?.customerName || 'Evento'}.pdf`);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = (rental: Rental) => {
    const text = `Olá ${rental.customerName}! Segue a proposta comercial para o seu evento no dia ${new Date(rental.date).toLocaleDateString('pt-BR')}. Valor Total: R$ ${rental.totalValue.toLocaleString('pt-BR')}`;
    window.open(`https://wa.me/${rental.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Orçamentos</h1>
          <p className="text-slate-400 font-bold flex items-center gap-2 uppercase text-xs tracking-widest mt-1">
            <FileText size={14} className="text-blue-600" /> {rentals.length} Propostas Geradas
          </p>
        </div>
        <button 
          onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Novo Orçamento
        </button>
      </div>

      {/* Grid de Orçamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rentals.map((rental) => (
          <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 p-4 rounded-3xl text-blue-600">
                <FileText size={24} />
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</span>
                <span className="text-xl font-black text-slate-800 font-mono">R$ {rental.totalValue.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-800 uppercase mb-1 truncate">{rental.customerName}</h3>
            <p className="text-slate-400 font-bold text-xs uppercase mb-6 flex items-center gap-2">
              <Calendar size={14} /> {new Date(rental.date).toLocaleDateString('pt-BR')}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedRental(rental)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                <Download size={14} /> PDF
              </button>
              <button 
                onClick={() => handleShareWhatsApp(rental)}
                className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all"
              >
                <MessageCircle size={14} /> Zap
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE VISUALIZAÇÃO E DOWNLOAD (A4) */}
      {selectedRental && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <button 
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
                Baixar Orçamento em PDF
              </button>
              <button onClick={() => setSelectedRental(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-10">
              {/* ÁREA DO PDF - LARGURA A4 FIXA */}
              <div 
                ref={budgetRef}
                className="bg-white mx-auto p-12 shadow-2xl text-slate-800"
                style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Inter, sans-serif' }}
              >
                {/* Cabeçalho Pro */}
                <div className="flex justify-between items-start border-b-4 border-blue-600 pb-10 mb-10">
                  <div>
                    <h1 className="text-5xl font-black text-blue-600 uppercase tracking-tighter">Proposta</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mt-2">Locação de Brinquedos e Serviços</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black uppercase">{company.name}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1">{company.phone}</p>
                    <p className="text-sm font-bold text-slate-500">{company.email}</p>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="grid grid-cols-2 gap-20 mb-12">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Dados do Cliente</span>
                    <h3 className="text-2xl font-black uppercase text-slate-900">{selectedRental.customerName}</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1">{selectedRental.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Detalhes do Evento</span>
                    <p className="text-lg font-black text-slate-900">{new Date(selectedRental.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm font-bold text-slate-500 uppercase">Horário: {selectedRental.startTime} às {selectedRental.endTime}</p>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="mb-12">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Item / Brinquedo</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Valor do Aluguel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toys.filter(t => selectedRental.toyIds.includes(t.id)).map(toy => (
                        <tr key={toy.id}>
                          <td className="px-6 py-5 font-bold text-slate-700 uppercase">{toy.name}</td>
                          <td className="px-6 py-5 text-right font-black text-slate-900">R$ {toy.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo e Pagamento */}
                <div className="flex flex-col items-end gap-6">
                  <div className="w-72 bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                      <span className="font-bold text-slate-600 font-mono">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200">
                      <span className="text-sm font-black text-slate-900 uppercase">Total Geral</span>
                      <span className="text-2xl font-black text-blue-600 font-mono">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="text-right max-w-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Formas de Pagamento</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">
                      Aceitamos {selectedRental.paymentMethod}. A reserva dos itens é garantida mediante sinal de 50%.
                    </p>
                  </div>
                </div>

                {/* Rodapé do PDF */}
                <div className="mt-auto pt-20 text-center">
                  <div className="inline-block border-t border-slate-200 px-10 pt-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Obrigado pela preferência!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de Criação/Edição (Mantido do original) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end">
           <form 
            onSubmit={(e) => { e.preventDefault(); /* Adicione sua função de salvar aqui */ setIsModalOpen(false); }}
            className="bg-white w-full max-w-xl h-full shadow-2xl p-10 overflow-y-auto"
           >
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                        {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
                    </h2>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all">
                        <X size={20}/>
                    </button>
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Informações do Cliente</label>
                        <select 
                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.customerId}
                            onChange={(e) => {
                                const c = customers.find(x => x.id === e.target.value);
                                setFormData({...formData, customerId: e.target.value, customerName: c?.name, customerPhone: c?.phone});
                            }}
                        >
                            <option value="">Selecionar Cliente</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                            <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Pagamento</label>
                            <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.paymentMethod} onChange={e=>setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Brinquedos Selecionados</label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {toys.map(t => (
                                <label key={t.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.toyIds?.includes(t.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50'}`}>
                                    <input type="checkbox" className="hidden" checked={formData.toyIds?.includes(t.id)} onChange={() => {
                                        const next = formData.toyIds?.includes(t.id) ? formData.toyIds.filter(x => x !== t.id) : [...(formData.toyIds || []), t.id];
                                        setFormData({...formData, toyIds: next});
                                    }} />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-700">{t.name}</span>
                                      <span className="text-[10px] font-bold text-slate-400">R$ {t.price.toLocaleString('pt-BR')}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[32px] flex justify-between items-center text-white">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total</span>
                        <span className="text-2xl font-black font-mono">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</span>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <CheckCircle size={18}/> {editingBudget ? 'Atualizar Proposta' : 'Criar Orçamento'}
                    </button>
                </div>
             </form>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
