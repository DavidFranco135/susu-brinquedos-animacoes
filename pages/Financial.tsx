// ... (mantenha os imports existentes)
// Adicione Treemap e ComposedChart aos imports do recharts
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Legend,
  ComposedChart, Line // Novos tipos de gráfico
} from 'recharts';

// No início do componente, vamos preparar novos dados memoizados
const Financial: React.FC<Props> = ({ rentals, setRentals, transactions, setTransactions }) => {
  // ... (mantenha os states existentes)

  // 1. Cálculo de Despesas por Categoria para o Gráfico de Pizza
  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredData.transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Number(t.value);
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 2. Dados Comparativos Mensais (Receita vs Despesa)
  const monthlyComparisonData = useMemo(() => {
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
      const mStr = String(i+1).padStart(2,'0');
      const monthRentals = rentals.filter(r => r.date.includes(`${filterYear}-${mStr}`));
      const monthTrans = transactions.filter(t => t.date.includes(`${filterYear}-${mStr}`));
      
      const revenue = monthRentals.reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0) + 
                      monthTrans.filter(t => t.type !== 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      const expense = monthTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      
      return { name: m, receita: revenue, despesa: expense, lucro: revenue - expense };
    });
  }, [rentals, transactions, filterYear]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* ... (Header e StatCards existentes permanecem iguais) ... */}

      {/* --- NOVA SEÇÃO DE GRÁFICOS ANALÍTICOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Gráfico 1: Composição de Despesas */}
        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
            Onde você gasta?
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Comparativo Receita x Despesa (Visão de Sustentabilidade) */}
        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            Desempenho: Receita vs Despesas
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
                <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- GRÁFICOS ORIGINAIS (Mantendo funcionamento) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Fluxo Diário do Mês (Seu gráfico original) */}
        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Fluxo Diário do Mês
            </h3>
            {/* ... (Mantenha o conteúdo original do AreaChart aqui) ... */}
        </div>

        {/* Lucratividade Anual (Seu gráfico original) */}
        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                Lucratividade Anual {filterYear}
            </h3>
            {/* ... (Mantenha o conteúdo original do BarChart aqui) ... */}
        </div>
      </div>

      {/* ... (Modais e formulários permanecem inalterados) ... */}
    </div>
  );
};
