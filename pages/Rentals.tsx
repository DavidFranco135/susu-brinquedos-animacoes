import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Loader2 } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore'; // Adicionado para deletar

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys }) => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Estado para feedback de exclusão

  const db = getFirestore(); // Inicializa o banco
  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // FUNÇÃO PARA APAGAR RESERVA
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir esta reserva permanentemente?")) return;
    
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "rentals", id));
      setRentals(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setIsDeleting(null);
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(toys.map(t => t.category)));
    return ['TODAS', ...uniqueCategories];
  }, [toys]);

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const rentalDate = new Date(rental.date);
      const isSameMonth = rentalDate.getMonth() === currentDate.getMonth() && 
                         rentalDate.getFullYear() === currentDate.getFullYear();
      const isSameYear = rentalDate.getFullYear() === currentDate.getFullYear();
      
      const categoryMatch = selectedCategory === 'TODAS' || 
                           rental.toyIds.some(id => toys.find(t => t.id === id)?.category === selectedCategory);

      if (viewTab === 'Mês') return isSameMonth && categoryMatch;
      if (viewTab === 'Ano') return isSameYear && categoryMatch;
      return categoryMatch;
    });
  }, [rentals, currentDate, viewTab, selectedCategory, toys]);

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX' as PaymentMethod,
    status: RentalStatus.CONFIRMED
  });

  useEffect(() => {
    if (editingRental) {
      setFormData(editingRental);
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '18:00',
        toyIds: [],
        totalValue: 0,
        entryValue: 0,
        paymentMethod: 'PIX' as PaymentMethod,
        status: RentalStatus.CONFIRMED
      });
    }
  }, [editingRental, isModalOpen]);

  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const total = selectedToys.reduce((acc, t) => acc + t.price, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.toyIds, toys]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
          <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Reservas</h1>
              <p className="text-slate-400 font-bold flex items-center gap-2 uppercase text-xs tracking-widest mt-1">
                  <CalendarIcon size={14} className="text-blue-600" /> {filteredRentals.length} Locações Encontradas
              </p>
          </div>
          <button 
              onClick={() => { setEditingRental(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
              <Plus size={20} /> Nova Reserva
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
          {filteredRentals.map((rental) => (
              <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group">
                  <div className="absolute top-6 right-6 flex gap-2 no-print">
                      <button 
                          onClick={() => { setEditingRental(rental); setIsModalOpen(true); }}
                          className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                      >
                          <Edit3 size={18} />
                      </button>
                      <button 
                          onClick={() => handleDelete(rental.id)} // BOTÃO CONSERTADO AQUI
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                          {isDeleting === rental.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      </button>
                  </div>

                  <h3 className="text-lg font-black text-slate-800 uppercase mb-1 truncate pr-20">{rental.customerName}</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase mb-6 flex items-center gap-2">
                    <CalendarIcon size={14} /> {new Date(rental.date).toLocaleDateString('pt-BR')}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {rental.toyIds.map(id => {
                        const toy = toys.find(t => t.id === id);
                        return toy ? (
                          <span key={id} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                            {toy.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <span className="text-xl font-black text-blue-600">R$ {rental.totalValue.toLocaleString('pt-BR')}</span>
                        <div className="flex gap-2">
                            <button className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all">
                                <MessageCircle size={18} />
                            </button>
                        </div>
                    </div>
                  </div>
              </div>
          ))}
      </div>
      
      {/* Restante do seu código (Modais, etc) deve vir abaixo mantendo sua estrutura original */}
    </div>
  );
};

export default Rentals;
