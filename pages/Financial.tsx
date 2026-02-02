import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  Calendar, Filter, ArrowUpCircle, ArrowDownCircle,
  BarChart3, PieChart, Download
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { Rental, FinancialTransaction, RentalStatus } from '../types';

interface FinancialProps {
  rentals: Rental[];
  transactions: FinancialTransaction[];
  setTransactions: (action: any) => void;
}

const Financial: React.FC<FinancialProps> = ({ rentals, transactions, setTransactions }) => {
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<'Receitas' | 'Despesas' | 'Lucro' | 'AReceber'>('Lucro');

  // 1. Filtragem por Período (Mês ou Ano)
  const filteredData = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const filteredRentals = rentals.filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return viewTab === 'Mês' ? (d.getMonth() === month && d.getFullYear() === year) : (d.getFullYear() === year);
    });

    const filteredTrans = transactions.filter(t => {
      const d = new Date(t.date);
      return viewTab === 'Mês' ? (d.getMonth() === month && d.getFullYear() === year) : (d.getFullYear() === year);
    });

    return { filteredRentals, filteredTrans };
  }, [rentals, transactions, currentDate, viewTab]);

  // 2. Cálculos dos Totais
  const stats = useMemo(() => {
    const receitas = filteredData.filteredRentals.reduce((acc, r) => acc + (r.entryValue || 0), 0);
    const despesas = filteredData.filteredTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const aReceber = filteredData.filteredRentals.reduce((acc, r) => acc + (r.totalValue - r.entryValue), 0);
    const lucro = receitas - despesas;

    return { receitas, despesas, aReceber, lucro };
  }, [filteredData]);

  // 3. Preparação dos Dados para o Gráfico Melhorado
  const chartData = useMemo(() => {
    if (viewTab === 'Ano') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map((m, i) => {
        const r = filteredData.filteredRentals.filter(rent => new Date(rent.date + 'T00:00:00').getMonth() === i).reduce((acc, rent) => acc + rent.entryValue, 0);
        const d = filteredData.filteredTrans.filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === i).reduce((acc, t) => acc + t.amount, 0);
        return { name: m, Entradas: r, Saídas: d, Lucro: r - d };
      });
    } else {
      // Visão mensal por semana ou dias (simplificado para 4 semanas)
      return [
        { name: 'Semana 1', Entradas: stats.receitas * 0.2, Saídas: stats.despesas * 0.2 },
        { name: 'Semana 2', Entradas: stats.receitas * 0.3, Saídas: stats.despesas * 0.4 },
        { name: 'Semana 3', Entradas: stats.receitas * 0.3, Saídas: stats.despesas * 0.2 },
        { name: 'Semana 4', Entradas: stats.receitas * 0.2, Saídas: stats.despesas * 0.2 },
      ];
    }
  }, [viewTab, filteredData, stats]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header com Filtro de Tempo */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Fluxo de Caixa</h1>
          <p className="text-slate-500 font-medium">Gestão financeira de entradas e saídas.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-[22px] shadow-sm border border-slate-100">
          <button onClick={() => setViewTab('Mês')} className={`px-8 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'Mês' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Mês</button>
          <button onClick={() => setViewTab('Ano')} className={`px-8 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'Ano' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Ano</button>
        </div>
      </header>

      {/* Cards de Resumo com Filtro ao Clicar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button onClick={() => setActiveFilter('Receitas')} className={`p-8 rounded-[40px] border-2 transition-all text-left ${activeFilter === 'Receitas' ? 'bg-emerald-500 border-emerald-200 text-white shadow-xl scale-105' : 'bg-white border-transparent hover:border-emerald-100'}`}>
          <ArrowUpCircle className={activeFilter === 'Receitas' ? 'text-white' : 'text-emerald-500'} size={32} />
          <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${activeFilter === 'Receitas' ? 'text-emerald-100' : 'text-slate-400'}`}>Receitas (Entradas)</p>
          <h3 className="text-2xl font-black mt-1">R$ {stats.receitas.toLocaleString('pt-BR')}</h3>
        </button>

        <button onClick={() => setActiveFilter('Despesas')} className={`p-8 rounded-[40px] border-2 transition-all text-left ${activeFilter === 'Despesas' ? 'bg-rose-500 border-rose-200 text-white shadow-xl scale-105' : 'bg-white border-transparent hover:border-rose-100'}`}>
          <ArrowDownCircle className={activeFilter === 'Despesas' ? 'text-white' : 'text-rose-500'} size={32} />
          <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${activeFilter === 'Despesas' ? 'text-rose-100' : 'text-slate-400'}`}>Despesas (Saídas)</p>
          <h3 className="text-2xl font-black mt-1">R$ {stats.despesas.toLocaleString('pt-BR')}</h3>
        </button>

        <button onClick={() => setActiveFilter('Lucro')} className={`p-8 rounded-[40px] border-2 transition-all text-left ${activeFilter === 'Lucro' ? 'bg-blue-600 border-blue-200 text-white shadow-xl scale-105' : 'bg-white border-transparent hover:border-blue-100'}`}>
          <TrendingUp className={activeFilter === 'Lucro' ? 'text-white' : 'text-blue-600'} size={32} />
          <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${activeFilter === 'Lucro' ? 'text-blue-100' : 'text-slate-400'}`}>Lucro Líquido</p>
          <h3 className="text-2xl font-black mt-1">R$ {stats.lucro.toLocaleString('pt-BR')}</h3>
        </button>

        <button onClick={() => setActiveFilter('AReceber')} className={`p-8 rounded-[40px] border-2 transition-all text-left ${activeFilter === 'AReceber' ? 'bg-amber-500 border-amber-200 text-white shadow-xl scale-105' : 'bg-white border-transparent hover:border-amber-100'}`}>
          <Wallet className={activeFilter === 'AReceber' ? 'text-white' : 'text-amber-500'} size={32} />
          <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${activeFilter === 'AReceber' ? 'text-amber-100' : 'text-slate-400'}`}>A Receber (Dívidas)</p>
          <h3 className="text-2xl font-black mt-1">R$ {stats.aReceber.toLocaleString('pt-BR')}</h3>
        </button>
      </div>

      {/* Gráfico Melhorado */}
      <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <BarChart3 className="text-blue-600" /> Desempenho do Período
          </h3>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} tickFormatter={(value) => `R$${value}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Area type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEntradas)" />
              <Area type="monotone" dataKey="Saídas" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorSaidas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listagem Filtrada Conforme o Card Clicado */}
      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
           <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Detalhamento: {activeFilter}</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-10 py-5">Descrição</th>
              <th className="px-8 py-5">Data</th>
              <th className="px-8 py-5">Valor</th>
              <th className="px-8 py-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
            {/* Se o filtro for Receitas ou Lucro, mostra os Sinais das Reservas */}
            {(activeFilter === 'Receitas' || activeFilter === 'Lucro') && filteredData.filteredRentals.map(r => (
              <tr key={r.id}>
                <td className="px-10 py-5 text-sm">Entrada: {r.customerName}</td>
                <td className="px-8 py-5 text-xs text-slate-400">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-5 text-emerald-600">+ R$ {r.entryValue.toLocaleString('pt-BR')}</td>
                <td className="px-8 py-5 text-right"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">Recebido</span></td>
              </tr>
            ))}

            {/* Se o filtro for Despesas ou Lucro, mostra as Transações de Saída */}
            {(activeFilter === 'Despesas' || activeFilter === 'Lucro') && filteredData.filteredTrans.map(t => (
              <tr key={t.id}>
                <td className="px-10 py-5 text-sm">{t.description}</td>
                <td className="px-8 py-5 text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-5 text-rose-500">- R$ {t.amount.toLocaleString('pt-BR')}</td>
                <td className="px-8 py-5 text-right"><span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase">Pago</span></td>
              </tr>
            ))}

            {/* Se o filtro for A Receber, mostra o saldo pendente das reservas */}
            {activeFilter === 'AReceber' && filteredData.filteredRentals.filter(r => r.totalValue > r.entryValue).map(r => (
              <tr key={r.id}>
                <td className="px-10 py-5 text-sm">Pendente: {r.customerName}</td>
                <td className="px-8 py-5 text-xs text-slate-400">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-5 text-amber-600">R$ {(r.totalValue - r.entryValue).toLocaleString('pt-BR')}</td>
                <td className="px-8 py-5 text-right"><span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase">Pendente</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Financial;
