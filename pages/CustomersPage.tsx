import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Building2, Download } from 'lucide-react';
import { Customer, User } from '../types';
import { db } from '../firebase';
import { deleteDoc, doc } from "firebase/firestore";

interface Props {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const CustomersPage: React.FC<Props> = ({ customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  
  const [formData, setFormData] = useState<Partial<Customer>>({ 
    name: '', 
    phone: '', 
    address: '', 
    isCompany: false, 
    cnpj: '',
    cpf: '',
    notes: '' 
  });

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.cnpj && c.cnpj.includes(searchTerm)) ||
    (c.cpf && c.cpf.includes(searchTerm))
  );

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('print-area-customers');
      if (!element) {
        alert('Erro: Elemento não encontrado');
        return;
      }
      
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '1200px';
      
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
      
      pdf.save(`base-clientes-susu.pdf`);
      
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      const element = document.getElementById('print-area-customers');
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

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setFormData(cust);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', address: '', isCompany: false, cnpj: '', cpf: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...formData } as Customer : c));
    } else {
      const newC: Customer = { 
        id: `c${Date.now()}`, 
        createdAt: new Date().toISOString(), 
        ...(formData as any) 
      };
      setCustomers(prev => [...prev, newC]);
    }
    setIsModalOpen(false);
  };

  // ✅ FUNÇÃO DE DELETE CORRIGIDA
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este cliente?")) return;
    
    try {
      await deleteDoc(doc(db, "customers", id));
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Erro ao excluir o cliente. Tente novamente.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Base de Clientes</h1>
            <p className="text-slate-500 font-medium">Gestão centralizada de contatos.</p>
        </div>
        <div className="flex gap-3">
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGeneratingPDF}
              className="bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={18} className="inline mr-2"/> {isGeneratingPDF ? 'Gerando...' : 'Exportar PDF'}
            </button>
            <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
                <Plus size={20} className="inline mr-2"/> Novo Cliente
            </button>
        </div>
      </header>

      <div id="print-area-customers" style={{ display: 'none' }} className="bg-white p-8 text-slate-900">
          <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-center">
              <div>
                  <h1 className="text-3xl font-black uppercase tracking-tight">Listagem Geral de Clientes</h1>
                  <p className="text-base font-bold mt-2 uppercase tracking-widest opacity-60">SUSU Animações e Brinquedos</p>
              </div>
              <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                  {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo" /> : <div className="w-full h-full bg-slate-100"/>}
              </div>
          </div>
          <table className="w-full text-base text-left border-collapse">
              <thead>
                  <tr className="border-b-2 border-slate-900 uppercase font-black">
                      <th className="py-2 px-2">Nome / Razão</th>
                      <th className="py-2 px-2">WhatsApp</th>
                      <th className="py-2 px-2">Documento</th>
                      <th className="py-2 px-2">Endereço Principal</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {filtered.map(c => (
                      <tr key={c.id}>
                          <td className="py-2 px-2 font-black text-slate-900">{c.name}</td>
                          <td className="py-2 px-2 font-bold">{c.phone}</td>
                          <td className="py-2 px-2 uppercase opacity-60">{c.isCompany ? c.cnpj : c.cpf}</td>
                          <td className="py-2 px-2 leading-tight">{c.address}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-6 border-t pt-3 text-xs font-black uppercase opacity-40 text-center">
              Gerado por {user?.name} em {new Date().toLocaleDateString('pt-BR')}
          </div>
      </div>

      <div className="bg-white rounded-3xl border p-2 flex gap-4 print:hidden shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por nome ou documento..." className="w-full pl-16 pr-6 py-4 bg-transparent outline-none font-bold text-slate-700 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm print:hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <tr>
                <th className="px-10 py-5">Identificação</th>
                <th className="px-8 py-5">WhatsApp</th>
                <th className="px-8 py-5">Documento</th>
                <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${c.isCompany ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                            {c.isCompany ? <Building2 size={18}/> : <Users size={18}/>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 uppercase tracking-tight">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Membro desde {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </td>
                <td className="px-8 py-6 text-slate-600 font-black">{c.phone}</td>
                <td className="px-8 py-6 uppercase font-bold text-slate-400 text-xs tracking-widest">{c.isCompany ? c.cnpj : c.cpf}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(c)} className="p-3 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(c.id)} className="p-3 bg-slate-100 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-[40px] p-10 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingCustomer ? 'Ficha do Cliente' : 'Novo Cliente'}</h2>
                <button type="button" onClick={()=>setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${!formData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                    <input type="radio" className="hidden" checked={!formData.isCompany} onChange={()=>setFormData({...formData, isCompany: false})} /> Pessoa Física
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${formData.isCompany ? 'bg-white border border-blue-100 text-blue-600' : 'bg-transparent text-slate-400'}`}>
                    <input type="radio" className="hidden" checked={formData.isCompany} onChange={()=>setFormData({...formData, isCompany: true})} /> Empresa (PJ)
                </label>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                    <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </div>
                
                {formData.isCompany ? (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                        <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={formData.cnpj} onChange={e=>setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                    </div>
                ) : (
                  <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                        <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={formData.cpf} onChange={e=>setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" />
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Principal</label>
                    <textarea required rows={2} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold resize-none" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} />
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Salvar Cliente</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
