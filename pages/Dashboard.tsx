
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarDays, TrendingUp, Plus, Clock, Star, DollarSign } from 'lucide-react';
import { Rental, RentalStatus, FinancialTransaction } from '../types';

interface DashboardProps {
  rentals: Rental[];
  toysCount: number;
  transactions: FinancialTransaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ rentals, toysCount, transactions }) => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const eventsToday = rentals.filter(r => r.date === today);
    const eventsMonth = rentals.filter(r => r.date.startsWith(currentMonth));
    
    const incomeMonth = rentals.filter(r => r.date.startsWith(currentMonth) && r.status !== RentalStatus.CANCELLED)
      .reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0) +
      transactions.filter(t => t.date.startsWith(currentMonth) && t.type !== 'EXPENSE').reduce((acc, t) => acc + t.value, 0);

    const expenseMonth = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'EXPENSE').reduce((acc, t) => acc + t.value, 0);
    
    const netProfit = incomeMonth - expenseMonth;

    return {
      eventsToday,
      eventsMonth,
      netProfit,
    };
  }, [rentals, transactions, today, currentMonth]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((month, index) => {
      const monthStr = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
      
      const income = rentals.filter(r => r.date.startsWith(monthStr) && r.status !== RentalStatus.CANCELLED)
        .reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0) +
        transactions.filter(t => t.date.startsWith(monthStr) && t.type !== 'EXPENSE').reduce((acc, t) => acc + t.value, 0);

      const expense = transactions.filter(t => t.date.startsWith(monthStr) && t.type === 'EXPENSE').reduce((acc, t) => acc + t.value, 0);
      
      return {
        name: month,
        valor: income - expense
      };
    });
  }, [rentals, transactions, currentYear]);

  const StatCard = ({ title, value, icon, color, subValue, path }: any) => (
    <div 
      onClick={() => path && navigate(path)}
      className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm flex items-start justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        {subValue && <p className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1">{subValue}</p>}
      </div>
      <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Painel Executivo</h1>
          <p className="text-slate-500 font-medium">Bem-vindo à central de inteligência SUSU de {currentYear}.</p>
        </div>
        <button onClick={() => navigate('/reservas')} className="flex items-center justify-center gap-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
          <Plus size={20} strokeWidth={3} /> Nova Reserva
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Reservas / Mês" value={stats.eventsMonth.length} icon={<CalendarDays size={26} />} color="blue" subValue="Ver todas" path="/reservas" />
        <StatCard title="Entregas Hoje" value={stats.eventsToday.length} icon={<Clock size={26} />} color="orange" subValue="Ver logística" path="/reservas" />
        <StatCard title="Total Catálogo" value={toysCount} icon={<Star size={26} />} color="purple" subValue="Gerenciar itens" path="/brinquedos" />
        <StatCard title="Saldo Líquido" value={`R$ ${stats.netProfit.toLocaleString('pt-BR')}`} icon={<DollarSign size={26} />} color="emerald" subValue="Ver financeiro" path="/financeiro" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
            Desempenho de {currentYear} (R$ Líquido)
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}} 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}
                  formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Valor']}
                />
                <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.valor >= 0 ? '#3B82F6' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-8">Próximos Eventos</h2>
          <div className="space-y-6">
            {rentals.filter(r => r.status !== RentalStatus.CANCELLED).slice(0, 5).map((rental) => (
              <div key={rental.id} onClick={() => navigate('/reservas')} className="flex items-center gap-5 group cursor-pointer">
                <div className="flex flex-col items-center justify-center bg-blue-50 w-14 h-14 rounded-2xl border border-blue-100 group-hover:bg-blue-500 transition-all group-hover:border-blue-500">
                  <span className="text-[10px] font-black text-blue-400 uppercase group-hover:text-blue-100">{rental.date.split('-')[1]}</span>
                  <span className="text-lg font-black text-blue-700 group-hover:text-white">{rental.date.split('-')[2]}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-[15px] font-black text-slate-800 group-hover:text-blue-600 truncate">{rental.customerName}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{rental.startTime}h - {rental.endTime}h</p>
                </div>
              </div>
            ))}
            {rentals.length === 0 && <p className="text-slate-400 text-sm italic text-center py-10">Sem eventos agendados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
