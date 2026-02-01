import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Filter, Download, DollarSign, ChevronRight, PieChart as PieIcon, Activity, BarChart3, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { FinancialTransaction, Rental, RentalStatus, User, PaymentMethod } from '../types';

interface Props {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
}

const Financial: React.FC<Props> = ({ rentals, setRentals, transactions, setTransactions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; type: 'INCOME' | 'EXPENSE' | 'PROFIT' | 'PENDING' | null }>({
    isOpen: false,
    type: null
  });
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const filteredData = useMemo(() => {
    const yearMatch = (date: string) => date.startsWith(filterYear);
    const monthMatch = (date: string) => filterMonth === 'ALL' || date.includes(`-${filterMonth}-`);
    
    return {
      rentals: rentals.filter(r => yearMatch(r.date) && monthMatch(r.date)),
      transactions: transactions.filter(t => yearMatch(t.date) && monthMatch(t.date))
    };
  }, [rentals, transactions, filterYear, filterMonth]);

  const realizedIncomeEntries = useMemo(() => {
    const entries: any[] = [];
    filteredData.rentals.forEach(r => {
      if (r.status === RentalStatus.CANCELLED) return;
      if (r.entryValue > 0) {
        entries.push({ id: `s-${r.id}`, date: r.date, description: `Sinal: ${r.customerName}`, value: r.entryValue, type: 'INCOME' });
      }
      if (r.status === RentalStatus.COMPLETED) {
        const balance = r.totalValue - (r.entryValue || 0);
        if (balance > 0) entries.push({ id: `l-${r.id}`, date: r.date, description: `Saldo: ${r.customerName}`, value: balance, type: 'INCOME' });
      }
    });
    filteredData.transactions.filter(t => t.type !== 'EXPENSE').forEach(t => entries.push({ ...t, value: Number(t.value) }));
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData]);

  const totalRealizedIncome = useMemo(() => realizedIncomeEntries.reduce((acc, e) => acc + e.value, 0), [realizedIncomeEntries]);
  const totalExpenses = useMemo(() => filteredData.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0), [filteredData]);
  const netProfit = totalRealizedIncome - totalExpenses;
  const profitMargin = totalRealizedIncome > 0 ? (netProfit / totalRealizedIncome) * 100 : 0;
  const totalPending = useMemo(() => filteredData.rentals.filter(r => r.status !== RentalStatus.CANCELLED && r.status !== RentalStatus.COMPLETED).reduce((acc, r) => acc + (r.totalValue - (r.entryValue || 0)), 0), [filteredData]);

  const handleSettleDebt = (rentalId: string) => {
    if (!confirm("Confirmar que o cliente pagou o saldo restante? Esta reserva será marcada como CONCLUÍDA.")) return;
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: RentalStatus.COMPLETED, entryValue: r.totalValue } : r));
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('financial-report-print');
      if (!element) {
        alert('Erro: Elemento não encontrado');
        return;
      }
      
      // Tornar visível temporariamente
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '1200px';
      
      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      
      pdf.save(`Relatorio_Financeiro_SUSU_${filterMonth}_${filterYear}.pdf`);
      
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      const element = document.getElementById('financial-report-print');
      if (element) {
        element.style.display = 'none';
        element.style.position = '';
        element.style.left = '';
        element.style.top = '';
        element.style.width = '';
      }
      setIsGeneratingPDF(false);
    }
  };

  const StatCard = ({ title, value, sub, icon, color, type, isMoney = true }: any) => (
    <div onClick={() => type && setDetailModal({ isOpen: true, type })} className={`bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all group relative overflow-hidden ${type ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`}></div>
      <div className="relative z-10">
        <div className={`p-4 bg-${color}-50 text-${color}-600 w-fit rounded-2xl mb-6`}>{icon}</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-2xl font-black text-slate-800">{isMoney ? 'R$ ' : ''}{value.toLocaleString('pt-BR', { minimumFractionDigits: isMoney ? 2 : 1 })}{!isMoney && '%'}</h3>
        <p className={`text-[10px] font-bold mt-2 uppercase tracking-tight flex items-center gap-1 text-${color}-500`}>{sub} {type && <ChevronRight size={12}/>}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Painel Financeiro</h1>
          <p className="text-slate-500 font-medium">Controle de lucros, despesas e recebíveis.</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-white border px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={18} /> {isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                <Plus size={18} /> Novo Lançamento
            </button>
        </div>
      </header>

      {/* Relatório Oculto para PDF */}
      <div id="financial-report-print" style={{ display: 'none' }} className="bg-white p-16 text-slate-900">
          <div className="border-b-4 border-slate-900 pb-10 mb-12 flex justify-between items-end">
              <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-slate-900">
                      {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo" /> : <div className="w-full h-full bg-slate-100"/>}
                  </div>
                  <div>
                      <h1 className="text-4xl font-black uppercase tracking-tight">Demonstrativo Financeiro</h1>
                      <p className="text-sm font-bold mt-2 uppercase tracking-widest opacity-60">SUSU Animações e Brinquedos</p>
                  </div>
              </div>
              <div className="text-right text-sm">
                  <p className="font-black opacity-40">PERÍODO</p>
                  <p className="font-black text-xl">{filterMonth === 'ALL' ? 'Ano Completo' : `${filterMonth}/${filterYear}`}</p>
              </div>
          </div>

          <div className="grid grid-cols-4 gap-8 mb-12">
              <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-200">
                  <p className="text-[10px] font-black uppercase mb-2 text-emerald-600">Receita Bruta</p>
                  <p className="text-3xl font-black text-emerald-700">R$ {totalRealizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200">
                  <p className="text-[10px] font-black uppercase mb-2 text-red-600">Despesas</p>
                  <p className="text-3xl font-black text-red-700">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-200">
                  <p className="text-[10px] font-black uppercase mb-2 text-blue-600">Lucro Líquido</p>
                  <p className="text-3xl font-black text-blue-700">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200">
                  <p className="text-[10px] font-black uppercase mb-2 text-amber-600">A Receber</p>
                  <p className="text-3xl font-black text-amber-700">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
          </div>

          <div className="space-y-8">
              <div>
                  <h2 className="text-2xl font-black uppercase mb-6 pb-3 border-b-2 border-slate-900">Receitas Realizadas</h2>
                  <table className="w-full text-xs border-collapse">
                      <thead>
                          <tr className="border-b-2 border-slate-900 uppercase font-black">
                              <th className="py-3 text-left">Data</th>
                              <th className="py-3 text-left">Descrição</th>
                              <th className="py-3 text-right">Valor</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {realizedIncomeEntries.slice(0, 15).map(e => (
                              <tr key={e.id}>
                                  <td className="py-3 font-bold opacity-60">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                  <td className="py-3 font-black">{e.description}</td>
                                  <td className="py-3 text-right font-black text-emerald-700">R$ {e.value.toLocaleString('pt-BR')}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              <div>
                  <h2 className="text-2xl font-black uppercase mb-6 pb-3 border-b-2 border-slate-900">Despesas Operacionais</h2>
                  <table className="w-full text-xs border-collapse">
                      <thead>
                          <tr className="border-b-2 border-slate-900 uppercase font-black">
                              <th className="py-3 text-left">Data</th>
                              <th className="py-3 text-left">Descrição</th>
                              <th className="py-3 text-right">Valor</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredData.transactions.filter(t => t.type === 'EXPENSE').slice(0, 15).map(t => (
                              <tr key={t.id}>
                                  <td className="py-3 font-bold opacity-60">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                  <td className="py-3 font-black">{t.description}</td>
                                  <td className="py-3 text-right font-black text-red-700">R$ {Number(t.value).toLocaleString('pt-BR')}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          <div className="mt-12 border-t-4 border-slate-900 pt-8 text-center">
              <div className="bg-slate-900 text-white p-8 rounded-3xl">
                  <p className="text-sm font-black uppercase mb-3 opacity-60">Resultado Final do Período</p>
                  <p className="text-5xl font-black">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-sm font-bold mt-3 uppercase">Margem de Lucro: {profitMargin.toFixed(1)}%</p>
              </div>
          </div>

          <div className="mt-10 border-t pt-4 text-[9px] font-black uppercase opacity-40 text-center">
              Gerado por {user?.name} em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center print:hidden">
        <div className="flex gap-3 items-center">
            <Filter size={18} className="text-slate-400"/>
            <span className="text-[10px] font-black text-slate-400 uppercase">Filtrar por:</span>
        </div>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-6 py-3 bg-white border rounded-2xl font-bold text-sm">
            <option value="ALL">Todos os Meses</option>
            {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                const name = new Date(2025, i, 1).toLocaleDateString('pt-BR', { month: 'long' });
                return <option key={m} value={m}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>;
            })}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-6 py-3 bg-white border rounded-2xl font-bold text-sm">
            {[2026, 2025, 2024, 2023].map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 print:hidden">
        <StatCard title="Receita Realizada" value={totalRealizedIncome} sub="Ver Detalhes" icon={<TrendingUp size={24}/>} color="emerald" type="INCOME" />
        <StatCard title="Despesas" value={totalExpenses} sub="Ver Detalhes" icon={<TrendingDown size={24}/>} color="red" type="EXPENSE" />
        <StatCard title="Lucro Líquido" value={netProfit} sub="Ver Composição" icon={<Wallet size={24}/>} color="blue" type="PROFIT" />
        <StatCard title="Valores Pendentes" value={totalPending} sub="Recebíveis" icon={<Clock size={24}/>} color="amber" type="PENDING" />
      </div>

      {detailModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4 print:hidden">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        {detailModal.type === 'INCOME' && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24}/></div>}
                        {detailModal.type === 'EXPENSE' && <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><TrendingDown size={24}/></div>}
                        {detailModal.type === 'PROFIT' && <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Wallet size={24}/></div>}
                        {detailModal.type === 'PENDING' && <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={24}/></div>}
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                {detailModal.type === 'INCOME' && 'Receitas Realizadas'}
                                {detailModal.type === 'EXPENSE' && 'Despesas Operacionais'}
                                {detailModal.type === 'PROFIT' && 'Composição do Lucro'}
                                {detailModal.type === 'PENDING' && 'Valores a Receber'}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Período: {filterMonth === 'ALL' ? `Ano ${filterYear}` : `${filterMonth}/${filterYear}`}</p>
                        </div>
                    </div>
                    <button onClick={() => setDetailModal({ isOpen: false, type: null })} className="p-4 bg-white text-slate-400 hover:text-slate-800 rounded-2xl shadow-sm transition-all"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">
                                <th className="pb-4">Data</th>
                                <th className="pb-4">Descrição</th>
                                <th className="pb-4 text-right">Valor Bruto</th>
                                {detailModal.type === 'PENDING' && <th className="pb-4 text-right">Ação</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {detailModal.type === 'INCOME' && realizedIncomeEntries.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-bold text-slate-500 text-sm">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="py-4 font-black text-slate-800 uppercase text-xs">{e.description}</td>
                                    <td className="py-4 text-right font-black text-emerald-600">R$ {e.value.toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                            {detailModal.type === 'EXPENSE' && filteredData.transactions.filter(t => t.type === 'EXPENSE').map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-bold text-slate-500 text-sm">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="py-4 font-black text-slate-800 uppercase text-xs">{t.description}</td>
                                    <td className="py-4 text-right font-black text-red-500">R$ {Number(t.value).toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                            {detailModal.type === 'PENDING' && filteredData.rentals.filter(r => r.status !== RentalStatus.CANCELLED && r.status !== RentalStatus.COMPLETED).map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-bold text-slate-500 text-sm">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="py-4 font-black text-slate-800 uppercase text-xs">{r.customerName} (Reserva #{r.id.slice(-4)})</td>
                                    <td className="py-4 text-right font-black text-amber-600">R$ {(r.totalValue - (r.entryValue || 0)).toLocaleString('pt-BR')}</td>
                                    <td className="py-4 text-right">
                                        <button 
                                            onClick={() => handleSettleDebt(r.id)}
                                            className="ml-auto flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                                        >
                                            <CheckCircle2 size={14}/> Quitar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {detailModal.type === 'PROFIT' && (
                                <>
                                    <tr className="bg-emerald-50/30"><td className="py-6 px-4 font-black uppercase text-xs" colSpan={2}>Receita Realizada</td><td className="py-6 px-4 text-right font-black text-emerald-600">R$ {totalRealizedIncome.toLocaleString('pt-BR')}</td></tr>
                                    <tr className="bg-red-50/30"><td className="py-6 px-4 font-black uppercase text-xs" colSpan={2}>Custos Operacionais</td><td className="py-6 px-4 text-right font-black text-red-600">- R$ {totalExpenses.toLocaleString('pt-BR')}</td></tr>
                                    <tr className="bg-blue-600 text-white"><td className="py-8 px-6 font-black uppercase text-sm" colSpan={2}>Lucro Líquido Final</td><td className="py-8 px-6 text-right font-black text-2xl">R$ {netProfit.toLocaleString('pt-BR')}</td></tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <form onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const val = Number(fd.get('value'));
             setTransactions(prev => [...prev, {
                id: `t${Date.now()}`,
                date: fd.get('date') as string,
                description: fd.get('description') as string,
                value: val,
                type: fd.get('type') as any,
                category: fd.get('category') as string
             }]);
             setIsModalOpen(false);
          }} className="bg-white w-full max-w-md rounded-[40px] p-10 space-y-6 shadow-2xl relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={20}/></button>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Novo Registro</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                <input required name="description" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none" placeholder="Ex: Manutenção Cama Elástica" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor R$</label>
                  <input required name="value" type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
                  <select name="type" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0">
                    <option value="EXPENSE">Despesa (Saída)</option>
                    <option value="INCOME">Entrada Extra</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data</label>
                  <input required name="date" type="date" defaultValue={now.toISOString().split('T')[0]} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                  <select name="category" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0">
                    <option value="Manutenção">Manutenção</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Equipe">Equipe</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">Registrar no Caixa</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Financial;
