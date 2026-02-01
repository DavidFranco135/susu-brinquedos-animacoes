
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info, Plus, Calendar as CalendarIcon, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Rental, Toy } from '../types';

interface AvailabilityProps {
  rentals: Rental[];
  toys: Toy[];
}

const Availability: React.FC<AvailabilityProps> = ({ rentals, toys }) => {
  const navigate = useNavigate();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [searchDate, setSearchDate] = useState(now.toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSearchDate(dateStr);
  };

  const dateAvailability = useMemo(() => {
    return toys.map(toy => {
      const rentedOnDate = rentals.filter(r => r.date === searchDate && r.toyIds.includes(toy.id)).length;
      const available = toy.quantity - rentedOnDate;
      return {
        ...toy,
        availableQuantity: available,
        isAvailable: available > 0
      };
    });
  }, [searchDate, rentals, toys]);

  const rentalsOnDate = useMemo(() => {
    return rentals.filter(r => r.date === searchDate);
  }, [searchDate, rentals]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Disponibilidade</h1>
          <p className="text-slate-500 font-medium">Controle de datas e gestão de estoque real.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-[32px] border shadow-sm">
            <Search size={18} className="text-slate-400 ml-3"/>
            <input type="date" className="bg-transparent border-0 font-black text-sm uppercase tracking-widest outline-none" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 bg-white p-8 md:p-12 rounded-[50px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
              {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
                <button onClick={() => changeMonth(-1)} className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all"><ChevronLeft size={20}/></button>
                <button onClick={() => changeMonth(1)} className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 mb-6">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[3px]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4 md:gap-6">
            {calendarDays.map((d, idx) => {
              if (d === null) return <div key={`empty-${idx}`} className="aspect-square"></div>;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const hasEvents = rentals.some(r => r.date === dateStr);
              const isSelected = searchDate === dateStr;
              
              return (
                <div 
                  key={d} 
                  onClick={() => handleDateClick(d)}
                  className={`aspect-square rounded-[32px] p-3 relative transition-all cursor-pointer group flex flex-col items-center justify-center border-4 ${
                    isSelected ? 'bg-blue-600 border-blue-100 shadow-xl scale-110' :
                    hasEvents ? 'bg-blue-50 border-blue-50 hover:bg-white hover:border-blue-500' : 
                    'bg-slate-50 border-transparent hover:border-blue-200 hover:bg-white'
                  }`}
                >
                  <span className={`text-lg font-black ${isSelected ? 'text-white' : hasEvents ? 'text-blue-600' : 'text-slate-400'}`}>{d}</span>
                  {hasEvents && !isSelected && <div className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
             <div className="mb-8 flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Estoque para {new Date(searchDate + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                <button onClick={() => navigate('/reservas', { state: { preSelectedDate: searchDate, openModal: true } })} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18}/></button>
             </div>
             
             <div className="space-y-6">
                {dateAvailability.map(toy => (
                  <div key={toy.id} className="flex items-center justify-between group">
                    <div>
                      <p className="font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{toy.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total: {toy.quantity} unid.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${toy.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {toy.isAvailable ? `${toy.availableQuantity} Disp.` : 'Esgotado'}
                      </span>
                      {toy.isAvailable ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertCircle size={16} className="text-red-500"/>}
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-12 pt-8 border-t border-slate-50">
               <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6">Eventos do Dia ({rentalsOnDate.length})</h3>
               <div className="space-y-4">
                 {rentalsOnDate.map(r => (
                   <div key={r.id} onClick={() => navigate('/reservas')} className="p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                     <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{r.customerName}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{r.startTime} às {r.endTime}</p>
                   </div>
                 ))}
                 {rentalsOnDate.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhuma entrega programada.</p>}
               </div>
             </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[50px] text-white relative overflow-hidden shadow-2xl">
            <Info size={32} className="mb-6 text-blue-500 opacity-60" />
            <p className="text-xl font-black leading-tight mb-4">Gestão Automática</p>
            <p className="text-sm font-medium opacity-60 leading-relaxed">O estoque é descontado automaticamente conforme novas reservas são confirmadas para cada data.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Availability;
