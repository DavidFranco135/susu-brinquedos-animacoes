import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Legend,
  ComposedChart, Line // Adicionados para o gráfico de performance
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
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; type: 'INCOME' | 'EXPENSE' | 'PROFIT' | 'PENDING' | null }>({
    isOpen: false,
    type: null
  });
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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

  // NOVOS CÁLCULOS PARA GRÁFICOS ANALÍTICOS
  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredData.transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
        const cat = t.category || 'Outros';
        categories[cat] = (categories[cat] || 0) + Number(t.value);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const monthlyComparisonData = useMemo(() => {
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
      const mStr = String(i+1).padStart(2,'0');
      const mRentals = rentals.filter(r => r.date.includes(`${filterYear}-${mStr}`));
      const mTrans = transactions.filter(t => t.date.includes(`${filterYear}-${mStr}`));
      
      const inc = mRentals.reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0) + 
                  mTrans.filter(t => t.type !== 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      const exp = mTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      
      return { name: m, receita: inc, despesa: exp, lucro: inc - exp };
    });
  }, [rentals, transactions, filterYear]);

  const handleSettleDebt = (rentalId: string) => {
    if (!confirm("Confirmar que o cliente pagou o saldo restante? Esta reserva será marcada como CONCLUÍDA.")) return;
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: RentalStatus.COMPLETED, entryValue: r.totalValue } : r));
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('financial-report-print');
    if (!element) return;
    element.classList.remove('hidden');
    const { jsPDF } = (window as any).jspdf;
    try {
        const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Relatorio_Financeiro_SUSU_${filterMonth}_${filterYear}.pdf`);
    } catch (err) { alert("Erro ao gerar PDF."); }
    finally { element.classList.add('hidden'); }
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
            <button onClick={handleDownloadPDF} className="bg-white border px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                <Download size={18} /> Exportar PDF
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                <Plus size={18} /> Novo Lançamento
            </button>
        </div>
      </header>

      {/* Relatório Oculto para PDF */}
      <div id="financial-report-print" className="hidden bg-white p-16 text-slate-900 w-[1000px]">
          <div className="border-b-4 border-slate-900 pb-10 mb-12 flex justify-between items-end">
              <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-slate-900">
                      {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
                  </div>
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Demonstrativo Financeiro</h1>
                    <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-2">
                      Período: {filterMonth === 'ALL' ? 'Todos os meses' : new Date(2000, Number(filterMonth)-1).toLocaleString('pt-BR', {month: 'long'})} / {filterYear}
                    </p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">Responsável</p>
                  <p className="font-bold">{user?.name}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-2">Data de Emissão</p>
                  <p className="font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-12">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Receita Realizada</p>
                  <p className="text-xl font-black text-emerald-600">R$ {totalRealizedIncome.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total Despesas</p>
                  <p className="text-xl font-black text-red-600">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-6 bg-slate-900 rounded-3xl text-white">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Lucro Líquido</p>
                  <p className="text-xl font-black text-blue-400">R$ {netProfit.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">A Receber</p>
                  <p className="text-xl font-black text-amber-600">R$ {totalPending.toLocaleString('pt-BR')}</p>
              </div>
          </div>

          <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 font-black uppercase text-[10px] tracking-widest">
                  <th className="py-3">Data</th>
                  <th className="py-3">Descrição do Lançamento</th>
                  <th className="py-3 text-right">Valor Operação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {realizedIncomeEntries.map(e => (
                      <tr key={e.id} className="text-[11px]">
                        <td className="py-4">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 font-bold uppercase">{e.description}</td>
                        <td className="py-4 text-right font-black text-emerald-600">+ R$ {e.value.toLocaleString('pt-BR')}</td>
                      </tr>
                  ))}
                  {filteredData.transactions.filter(t => t.type === 'EXPENSE').map(t => (
                      <tr key={t.id} className="text-[11px]">
                        <td className="py-4">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 font-bold uppercase">{t.description}</td>
                        <td className="py-4 text-right font-black text-red-600">- R$ {Number(t.value).toLocaleString('pt-BR')}</td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-20 pt-10 border-t-2 border-slate-900 text-center flex justify-between items-center opacity-40">
              <p className="text-[9px] font-black uppercase">Relatório Gerencial SUSU Animações</p>
              <p className="text-[9px] font-black uppercase font-mono">HASH-REF: {Date.now().toString(16).toUpperCase()}</p>
          </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter size={18} className="text-slate-400" />
          <div className="flex gap-2 w-full md:w-auto">
            <select className="flex-1 md:flex-none bg-slate-50 px-4 py-2 rounded-xl font-bold border-0 text-sm" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
              <option value="ALL">TODOS OS MESES</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m}>{new Date(2000, Number(m)-1).toLocaleString('pt-BR', {month: 'long'})}</option>
              ))}
            </select>
            <select className="flex-1 md:flex-none bg-slate-50 px-4 py-2 rounded-xl font-bold border-0 text-sm" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-8 pr-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo em Caixa</p>
                <p className="text-xl font-black text-emerald-600">R$ {netProfit.toLocaleString('pt-BR')}</p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Entradas" value={totalRealizedIncome} sub="Receita em conta" icon={<TrendingUp size={24}/>} color="emerald" type="INCOME" />
        <StatCard title="Saídas" value={totalExpenses} sub="Despesas pagas" icon={<TrendingDown size={24}/>} color="red" type="EXPENSE" />
        <StatCard title="A Receber" value={totalPending} sub="Dívidas pendentes" icon={<Clock size={24}/>} color="amber" type="PENDING" />
        <StatCard title="Rentabilidade" value={profitMargin} sub="Margem de lucro" icon={<Activity size={24}/>} color="purple" type="PROFIT" isMoney={false} />
        <StatCard title="Lucro Líquido" value={netProfit} sub="O que sobrou" icon={<DollarSign size={24}/>} color="blue" type="PROFIT" />
      </div>

      {/* NOVOS GRÁFICOS ANALÍTICOS INSERIDOS AQUI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Gastos por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseByCategory.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div> Performance Mensal (Receita vs Lucro)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Fluxo Diário do Mês
            </h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realizedIncomeEntries.reduce((acc: any[], curr) => {
                        const day = curr.date.split('-')[2];
                        const existing = acc.find(a => a.day === day);
                        if (existing) existing.value += curr.value;
                        else acc.push({ day, value: curr.value });
                        return acc;
                    }, []).sort((a, b) => a.day.localeCompare(b.day))}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                Lucratividade Anual {filterYear}
            </h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                        <Tooltip />
                        <Bar dataKey="lucro" radius={[8, 8, 0, 0]}>
                            {monthlyComparisonData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === now.getMonth() ? '#3B82F6' : '#E2E8F0'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {detailModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[400] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                            {detailModal.type === 'INCOME' && 'Entradas Detalhadas'}
                            {detailModal.type === 'EXPENSE' && 'Despesas Detalhadas'}
                            {detailModal.type === 'PENDING' && 'Controle de Recebíveis'}
                            {detailModal.type === 'PROFIT' && 'Demonstrativo de Lucros'}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dados reais extraídos da base de dados</p>
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
