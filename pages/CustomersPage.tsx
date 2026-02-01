
import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Building2, Download } from 'lucide-react';
import { Customer, User } from '../types';

interface Props {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const CustomersPage: React.FC<Props> = ({ customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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

  const handleDownloadPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Detecta se é mobile
  const isMobile = window.innerWidth < 768;
  
  // Mostra loading
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'pdf-loading';
  loadingDiv.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center';
  loadingDiv.innerHTML = `
    <div class="bg-white rounded-3xl p-8 text-center space-y-4">
      <div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="font-black text-slate-800 text-sm uppercase tracking-widest">Gerando PDF...</p>
      <p class="text-xs text-slate-400">Isso pode levar alguns segundos</p>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  
  // Salva estilos originais
  const originalStyles = {
    display: element.style.display,
    position: element.style.position,
    left: element.style.left,
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    transform: element.style.transform,
    overflow: element.style.overflow
  };
  
  // Prepara elemento para renderização
  element.classList.remove('hidden');
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.width = '794px'; // Largura A4 em pixels (210mm)
  element.style.maxWidth = '794px';
  element.style.transform = 'scale(1)';
  element.style.overflow = 'visible';
  
  // Aguarda fontes e imagens carregarem
  await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 500));
  
  const { jsPDF } = (window as any).jspdf;
  
  try {
    const canvas = await (window as any).html2canvas(element, { 
      scale: isMobile ? 2 : 3, // Menor scale no mobile para economizar memória
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
      windowHeight: element.scrollHeight,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
      allowTaint: true,
      backgroundColor: '#ffffff',
      removeContainer: true,
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Remove elementos que podem causar problemas
          clonedElement.querySelectorAll('button, .no-print').forEach(el => el.remove());
          
          // Ajusta fontes para melhor renderização
          clonedElement.style.fontSmoothing = 'antialiased';
          clonedElement.style.webkitFontSmoothing = 'antialiased';
          
          // Garante que textos não quebrem incorretamente
          const textElements = clonedElement.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
          textElements.forEach(el => {
            (el as HTMLElement).style.wordBreak = 'normal';
            (el as HTMLElement).style.overflowWrap = 'normal';
            (el as HTMLElement).style.whiteSpace = 'normal';
          });
        }
      }
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG com qualidade 95% (menor tamanho)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    // Adiciona primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
    
    // Adiciona páginas extras se necessário
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
    
    // Salva o PDF
    if (isMobile) {
      // No mobile, abre em nova aba para facilitar download
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      pdf.save(`${filename}.pdf`);
    }
    
    // Feedback de sucesso
    loadingDiv.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center space-y-4">
        <div class="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p class="font-black text-slate-800 text-sm uppercase tracking-widest">PDF Gerado!</p>
      </div>
    `;
    
    setTimeout(() => loadingDiv.remove(), 1500);
    
  } catch (err) {
    console.error("PDF Error:", err);
    
    // Mostra erro amigável
    loadingDiv.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center space-y-4 max-w-sm">
        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <p class="font-black text-slate-800 text-sm uppercase tracking-widest">Erro ao gerar PDF</p>
        <p class="text-xs text-slate-400">Tente novamente ou use um navegador diferente</p>
        <button onclick="document.getElementById('pdf-loading').remove()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase">
          Fechar
        </button>
      </div>
    `;
    
  } finally {
    // Restaura estilos originais
    Object.keys(originalStyles).forEach(key => {
      element.style[key] = originalStyles[key];
    });
    
    if (element.classList.contains('hidden')) {
      element.classList.add('hidden');
    }
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

  const handleDelete = (id: string) => {
      if(confirm("Deseja realmente excluir este cliente?")) {
          setCustomers(prev => prev.filter(c => c.id !== id));
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
            <button onClick={handleDownloadPDF} className="bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                <Download size={18} className="inline mr-2"/> Exportar PDF
            </button>
            <button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all">
                <Plus size={20} className="inline mr-2"/> Novo Cliente
            </button>
        </div>
      </header>

      <div id="print-area-customers" className="hidden bg-white p-12 text-slate-900">
          <div className="border-b-4 border-slate-900 pb-8 mb-8 flex justify-between items-center">
              <div>
                  <h1 className="text-3xl font-black uppercase tracking-tight">Listagem Geral de Clientes</h1>
                  <p className="text-sm font-bold mt-2 uppercase tracking-widest opacity-60">SUSU Animações e Brinquedos</p>
              </div>
              <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-slate-900">
                  {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"/>}
              </div>
          </div>
          <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                  <tr className="border-b-2 border-slate-900 uppercase font-black">
                      <th className="py-2">Nome / Razão</th>
                      <th className="py-2">WhatsApp</th>
                      <th className="py-2">Documento</th>
                      <th className="py-2">Endereço Principal</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {filtered.map(c => (
                      <tr key={c.id}>
                          <td className="py-3 font-black text-slate-900">{c.name}</td>
                          <td className="py-3 font-bold">{c.phone}</td>
                          <td className="py-3 uppercase opacity-60">{c.isCompany ? c.cnpj : c.cpf}</td>
                          <td className="py-3 text-[9px] leading-tight max-w-[200px]">{c.address}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-10 border-t pt-4 text-[9px] font-black uppercase opacity-40 text-center">
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
          <form onSubmit={handleSubmit} className="bg-white w-full max-lg rounded-[40px] p-10 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingCustomer ? 'Ficha do Cliente' : 'Novo Cliente'}</h2>
                <button type="button" onClick={()=>setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all bg-white border border-blue-100 text-blue-600">
                    <input type="radio" className="hidden" checked={!formData.isCompany} onChange={()=>setFormData({...formData, isCompany: false})} /> Pessoa Física
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all bg-white border border-slate-100 text-slate-400">
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
