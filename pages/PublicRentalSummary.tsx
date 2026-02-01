
import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Calendar, Clock, Phone, Printer, Gamepad2, PartyPopper } from 'lucide-react';
import { Rental, Toy, CompanySettings } from '../types';

interface Props {
  rentals: Rental[];
  toys: Toy[];
  company: CompanySettings;
}

const PublicRentalSummary: React.FC<Props> = ({ rentals, toys, company }) => {
  const { id } = useParams<{ id: string }>();
  const rental = rentals.find(r => r.id === id);

  if (!rental) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Resumo não encontrado</h1>
        <p className="text-slate-400 mt-2 font-medium">Link expirado ou código de reserva inválido.</p>
      </div>
    );
  }

  const rentalToys = toys.filter(t => rental.toyIds.includes(t.id));
  const pending = rental.totalValue - rental.entryValue;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Público */}
        <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-blue-500/5 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center text-white shadow-lg shadow-blue-200">
               <PartyPopper size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tudo pronto para a diversão!</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Resumo da sua locação</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="bg-slate-50 text-slate-400 p-4 rounded-2xl hover:bg-slate-900 hover:text-white transition-all print:hidden">
            <Printer size={24} />
          </button>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-[50px] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50">
          <div className="p-10 md:p-16 space-y-12">
            {/* Seção Cliente e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-b border-slate-50 pb-12">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Cliente</p>
                <h2 className="text-2xl font-black text-slate-900 leading-none">{rental.customerName}</h2>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                   <Phone size={14} /> {company.phone}
                </div>
              </div>
              <div className="space-y-4 md:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Protocolo</p>
                <p className="text-xl font-mono font-black text-slate-800">#{rental.id.slice(-6).toUpperCase()}</p>
                <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {rental.status}
                </span>
              </div>
            </div>

            {/* Seção Logística */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> Data</p>
                  <p className="font-black text-slate-800 text-lg">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p>
               </div>
               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Clock size={12}/> Horário</p>
                  <p className="font-black text-slate-800 text-lg">{rental.startTime}h às {rental.endTime}h</p>
               </div>
               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><MapPin size={12}/> Local</p>
                  <p className="font-bold text-slate-600 text-sm leading-tight">{rental.eventAddress}</p>
               </div>
            </div>

            {/* Brinquedos */}
            <div className="space-y-6">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
                 <Gamepad2 size={18} className="text-blue-600" /> Atrações Confirmadas
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rentalToys.map(toy => (
                    <div key={toy.id} className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm">
                         <img src={toy.imageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{toy.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{toy.size || 'Tam. Padrão'}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Financeiro para o Cliente */}
            <div className="bg-slate-900 rounded-[40px] p-10 md:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px] mb-2">Valor da Locação</p>
                  <p className="text-5xl font-black">R$ {rental.totalValue.toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex justify-between items-center gap-10">
                      <span className="text-[10px] font-black uppercase text-slate-400">Sinal Pago</span>
                      <span className="text-emerald-400 font-black text-lg">R$ {rental.entryValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className={`px-6 py-4 rounded-2xl flex justify-between items-center gap-10 ${pending > 0 ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                      <span className="text-[10px] font-black uppercase text-white/60">{pending > 0 ? 'Saldo Restante' : 'Status'}</span>
                      <span className="text-white font-black text-lg">{pending > 0 ? `R$ ${pending.toLocaleString('pt-BR')}` : 'PAGO'}</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
             <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest">
               <CheckCircle2 size={16} /> Reserva Processada por {company.name}
             </div>
             <p className="text-[10px] font-bold text-slate-400 max-w-sm">Este resumo é apenas informativo. Para alterações, entre em contato com nosso atendimento oficial.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicRentalSummary;
