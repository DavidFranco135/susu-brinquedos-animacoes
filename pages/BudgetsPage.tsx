import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, X, Plus, CheckCircle, Edit3, MessageCircle, Trash2, Loader2 } from 'lucide-react';
import { Rental, Toy, Customer, CompanySettings, RentalStatus, User } from '../types';
import { getFirestore, doc, deleteDoc, setDoc, addDoc, collection } from 'firebase/firestore';

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const db = getFirestore();
  
  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    status: RentalStatus.PENDING
  });

  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const total = selectedToys.reduce((acc, t) => acc + t.price, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.toyIds, toys]);

  // FUNÇÃO PARA BAIXAR/IMPRIMIR
  const handlePrint = () => {
    window.print();
  };

  // FUNÇÃO PARA APAGAR
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este orçamento permanentemente?")) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "rentals", id));
    } catch (e) {
      alert("Erro ao excluir.");
    } finally {
      setIsDeleting(null);
    }
  };

  // FUNÇÃO PARA EDITAR
  const handleEdit = (rental: Rental) => {
    setEditingBudget(rental);
    setFormData(rental);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await setDoc(doc(db, "rentals", editingBudget.id), formData);
      } else {
        await addDoc(collection(db, "rentals"), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingBudget(null);
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* CSS para garantir que o PDF não saia branco e oculte o que não deve */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Orçamentos</h1>
          <p className="text-slate-400 font-bold flex items-center gap-2 uppercase text-xs tracking-widest mt-1">
            <FileText size={14} className="text-blue-600" /> {rentals.length} Propostas
          </p>
        </div>
        <button 
          onClick={() => { setEditingBudget(null); setFormData({date: new Date().toISOString().split('T')[0], toyIds: [], totalValue: 0}); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Novo Orçamento
        </button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {rentals.map((rental) => (
          <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 p-4 rounded-3xl text-blue-600">
                <FileText size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(rental)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                  <Edit3 size={18} />
                </button>
                <button onClick={() => handleDelete(rental.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                  {isDeleting === rental.id ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase mb-1 truncate">{rental.customerName}</h3>
            <p className="text-slate-400 font-bold text-xs uppercase mb-6 flex items-center gap-2">
              <Calendar size={14} /> {new Date(rental.date).toLocaleDateString('pt-BR')}
            </p>
            <button 
              onClick={() => setSelectedRental(rental)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
            >
              Visualizar PDF
            </button>
          </div>
        ))}
      </div>

      {/* Modal de Visualização (Onde gera o PDF) */}
      {selectedRental && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg">
                <Download size={16} /> Baixar PDF
              </button>
              <button onClick={() => setSelectedRental(null)} className="p-3 text-slate-400 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
              <div id="print-area" className="bg-white mx-auto p-12 max-w-[210mm] shadow-sm text-slate-800">
                <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
                  <div>
                    <h1 className="text-4xl font-black text-blue-600 uppercase leading-none">Orçamento</h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-sm">Proposta Comercial</p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-black text-xl uppercase tracking-tight">{company.name}</h2>
                    <p className="text-xs font-bold text-slate-500">{company.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cliente</span>
                    <p className="font-black text-lg text-slate-800 uppercase">{selectedRental.customerName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Data do Evento</span>
                    <p className="font-black text-lg text-slate-800">{new Date(selectedRental.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <table className="w-full mb-10">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">Descrição</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {toys.filter(t => selectedRental.toyIds.includes(t.id)).map(toy => (
                      <tr key={toy.id}>
                        <td className="px-6 py-5 font-bold text-slate-700 uppercase text-sm">{toy.name}</td>
                        <td className="px-6 py-5 text-right font-black">R$ {toy.price.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end text-right">
                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <span className="text-sm font-black text-slate-800 uppercase">Total: </span>
                    <span className="text-xl font-black text-blue-600">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário (Criar/Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end no-print">
          <form onSubmit={handleSave} className="bg-white w-full max-w-xl h-full shadow-2xl p-10 overflow-y-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 uppercase">Cliente</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none"
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})}/>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-blue-600 uppercase">Brinquedos</label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {toys.map(t => (
                    <label key={t.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer ${formData.toyIds?.includes(t.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50'}`}>
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
              <div className="bg-slate-900 p-8 rounded-[32px] text-white flex justify-between items-center">
                <span className="text-xs font-black uppercase">Total</span>
                <span className="text-2xl font-black">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</span>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                {editingBudget ? 'Salvar Alterações' : 'Criar Orçamento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
