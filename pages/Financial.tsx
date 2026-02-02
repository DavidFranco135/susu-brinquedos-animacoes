import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, X, DollarSign, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, PieChart as PieIcon
} from 'lucide-react';
import { FinancialTransaction, Rental, RentalStatus, User, PaymentMethod } from '../types';

interface Props {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
}

const Financial: React.FC<Props> = ({ rentals, transactions, setTransactions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));

  // Lógica de Cálculos de Resumo
  const stats = useMemo(() => {
    const periodTransactions = transactions.filter(t => t.date.startsWith(`${filterYear}-${filterMonth}`));
    const periodRentals = rentals.filter(r => r.date.startsWith(`${filterYear}-${filterMonth}`) && r.status !== RentalStatus.CANCELLED);

    const extraIncome = periodTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.value, 0);
    // Soma o total se concluído ou apenas a entrada se pendente
    const rentalIncome = periodRentals.reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0);
    
    const income = extraIncome + rentalIncome;
    const expense = periodTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.value, 0);

    return {
      income,
      expense,
      profit: income - expense,
      pending: periodRentals.filter(r => r.status !== RentalStatus.COMPLETED).reduce((acc, r) => acc + (r.totalValue - r.entryValue), 0)
    };
  }, [rentals, transactions, filterMonth, filterYear]);

  // Dados para o Gráfico de Área (Fluxo Diário)
  const chartData = useMemo(() => {
    const daysInMonth = new Date(Number(filterYear), Number(filterMonth), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = `${filterYear}-${filterMonth}-${day}`;
      
      const tIn = transactions.filter(t => t.date === dateStr && t.type === 'INCOME').reduce((acc, t) => acc + t.value, 0);
      const rIn = rentals.filter(r => r.date === dateStr && r.status !== RentalStatus.CANCELLED)
                         .reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0);
      const exp = transactions.filter(t => t.date === dateStr && t.type === 'EXPENSE').reduce((acc, t) => acc + t.value, 0);

      return {
        name: day,
        receita: tIn + rIn,
        despesa: exp
      };
    });
  }, [rentals, transactions, filterMonth, filterYear]);

  // Função do Botão "Novo Lançamento" (Corrigida)
  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newTransaction: FinancialTransaction = {
      id: `t${Date.now()}`, // Gera ID único para o Firebase
      description: formData.get('description') as string,
      value: Number(formData.get('value')),
      type: formData.get('type') as 'INCOME' | 'EXPENSE',
      date: formData.get('date') as string,
      category: formData.get('category') as string,
      paymentMethod: 'PIX'
    };

    setTransactions(prev => [...prev, newTransaction]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Financeiro</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} className="text-blue-500"/> Controle de Fluxo de Caixa
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
             <select 
               className="bg-transparent border-0 px-4 py-2 font-bold text-xs outline-none"
               value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
             >
               {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
             </select>
             <select 
               className="bg-transparent border-0 px-4 py-2 font-bold text-xs outline-none border-l border-slate-100"
               value={filterYear} onChange={e => setFilterYear(e.target.value)}
             >
               {['2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={48}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Receitas</p>
          <p className="text-2xl font-black text-emerald-600">R$ {stats.income.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown size={48}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Despesas</p>
          <p className="text-2xl font-black text-red-500">R$ {stats.expense.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-blue-400"><DollarSign size={48}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Lucro Estimado</p>
          <p className="text-2xl font-black text-white">R$ {stats.profit.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-blue-600"><Calendar size={48}/></div>
          <p className="text-[10px] font-black text-blue-400 uppercase mb-1">A Receber</p>
          <p className="text-2xl font-black text-blue-700">R$ {stats.pending.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Gráfico Visual Principal */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black uppercase text-slate-800 text-sm tracking-widest flex items-center gap-2">
            <Activity size={18} className="text-blue-500"/> Fluxo Diário de Caixa
          </h3>
          <div className="flex gap-4 text-[10px] font-bold uppercase">
             <span className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Receita</span>
             <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"/> Despesa</span>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <Tooltip 
                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '15px'}}
                itemStyle={{fontSize: '12px', fontWeight: '900', textTransform: 'uppercase'}}
              />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRec)" />
              <Area type="monotone" dataKey="despesa" stroke="#f87171" strokeWidth={4} fill="none" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal Novo Lançamento (Consertado) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl overflow-hidden relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800 transition-colors"><X/></button>
            
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Novo Lançamento</h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Descrição do Lançamento</label>
                <input required name="description" placeholder="Ex: Manutenção Pula-Pula" className="w-full p-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor (R$)</label>
                  <input required name="value" type="number" step="0.01" placeholder="0,00" className="w-full p-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tipo</label>
                  <select name="type" className="w-full p-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none">
                    <option value="EXPENSE">Despesa (Saída)</option>
                    <option value="INCOME">Receita Extra (Entrada)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data</label>
                  <input required name="date" type="date" defaultValue={now.toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Categoria</label>
                  <select name="category" className="w-full p-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none">
                    <option value="Manutenção">Manutenção</option>
                    <option value="Equipe">Pagamento Equipe</option>
                    <option value="Marketing">Marketing/Anúncios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                Salvar no Sistema
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financial;
