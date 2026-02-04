import React, { useState, useRef } from 'react';
import { FileSignature, Receipt, Download, X, Eye, Upload, Image as ImageIcon } from 'lucide-react';
import { Rental, Customer, CompanySettings, User } from '../types';

interface Props {
  type: 'contract' | 'receipt';
  rentals: Rental[];
  customers: Customer[];
  company: CompanySettings;
}

const DocumentsPage: React.FC<Props> = ({ type, rentals, customers, company }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [contractTerms, setContractTerms] = useState(company.contractTerms || '1. OBJETO: A CONTRATADA compromete-se a disponibilizar os brinquedos e equipamentos em perfeito estado de higienização e segurança.\n2. RESPONSABILIDADE: O CONTRATANTE assume inteira responsabilidade por mau uso.\n3. CANCELAMENTO: Desistências com menos de 48h não têm estorno do sinal.');
  const [contractImage, setContractImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const Title = type === 'contract' ? 'Contrato de Locação' : 'Recibo de Pagamento';
  const Icon = type === 'contract' ? FileSignature : Receipt;

  const handleDownloadPDF = async (elementId: string, filename: string) => {
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        alert('Erro: Elemento não encontrado');
        return;
      }

      // Configurações otimizadas para captura
      const canvas = await (window as any).html2canvas(element, {
        scale: 3, // Maior qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200, // Largura fixa para consistência
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = (window as any).jspdf;
      
      // Criar PDF em formato A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Dimensões do A4 em mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      
      // Calcular dimensões da imagem mantendo proporção
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Se a imagem couber em uma página
      if (imgHeight <= pageHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        // Dividir em múltiplas páginas
        let heightLeft = imgHeight;
        let position = margin;
        
        // Primeira página
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin);
        
        // Páginas seguintes
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setContractImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-6 print:hidden">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Icon size={24}/></div>
            <div>
                <h1 className="text-2xl font-bold">{Title}s</h1>
                <p className="text-slate-500">Documentação legal baseada em reservas.</p>
            </div>
        </div>
        {type === 'contract' && (
            <button onClick={()=>setIsEditing(!isEditing)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-500 text-white shadow-xl' : 'bg-white border text-slate-600 shadow-sm'}`}>
                {isEditing ? 'Confirmar Termos' : 'Ajustar Cláusulas'}
            </button>
        )}
      </header>

      {isEditing && type === 'contract' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top duration-300 print:hidden">
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Editar Cláusulas Gerais</label>
                  <textarea 
                    rows={10} 
                    className="w-full p-6 bg-white border border-slate-200 rounded-[32px] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
                    value={contractTerms}
                    onChange={e => setContractTerms(e.target.value)}
                  />
              </div>
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mapa ou Foto Técnica (Opcional)</label>
                  <div className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden group">
                      {contractImage ? (
                          <img src={contractImage} className="w-full h-full object-cover" />
                      ) : (
                          <div className="text-center space-y-2 text-slate-300">
                              <ImageIcon size={48} className="mx-auto" />
                              <p className="text-xs font-black uppercase">Adicionar anexo visual</p>
                          </div>
                      )}
                      <button type="button" onClick={()=>fileInputRef.current?.click()} className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <Upload className="text-white" size={32}/>
                      </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
          </div>
      )}

      <div className="bg-white rounded-[32px] border overflow-hidden shadow-sm print:hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
            <tr><th className="px-6 py-4">Data do Evento</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {rentals.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4 font-bold">{r.date}</td>
                <td className="px-6 py-4">{r.customerName}</td>
                <td className="px-6 py-4 font-black text-slate-900">R$ {r.totalValue.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={()=>setSelectedRental(r)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all"><Eye size={16}/> Visualizar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRental && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 print:p-0">
          <div className="bg-white w-full max-w-3xl max-h-[95vh] print:max-h-none rounded-[40px] print:rounded-none overflow-hidden flex flex-col print:block shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 print:hidden">
              <h2 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Documento Gerado</h2>
              <button onClick={()=>setSelectedRental(null)} className="p-2 hover:bg-white rounded-full"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto print:overflow-visible">
              <div className="p-8 md:p-12 bg-white text-slate-800 space-y-8 font-serif leading-relaxed" id="document-print-area" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                <div className="flex flex-col items-center text-center space-y-4 pb-8 border-b">
                  <div className="w-24 h-24 rounded-[28px] overflow-hidden border-2 border-slate-900 mb-2">
                      {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Logo" /> : <div className="w-full h-full bg-slate-100"/>}
                  </div>
                  <h1 className="text-4xl font-black uppercase tracking-tight">{Title}</h1>
                  <div className="text-base uppercase font-bold text-slate-500">
                      <p>{company.name} | CNPJ: {company.cnpj}</p>
                      <p>{company.address}</p>
                      <p>Contatos: {company.phone} | {company.email}</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-lg">
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-2 border border-slate-100">
                      <p><strong>CLIENTE / LOCATÁRIO:</strong> {selectedRental.customerName}</p>
                      <p><strong>DOC:</strong> {customers.find(c=>c.id===selectedRental.customerId)?.cnpj || customers.find(c=>c.id===selectedRental.customerId)?.cpf || 'Não informado'}</p>
                      <p><strong>ENDEREÇO DO EVENTO:</strong> {selectedRental.eventAddress || customers.find(c=>c.id===selectedRental.customerId)?.address}</p>
                  </div>

                  <div className="bg-slate-900 text-white p-8 rounded-[32px] grid grid-cols-2 gap-4">
                      <div>
                          <p className="text-xs font-black uppercase text-slate-500 mb-1">Valor Total</p>
                          <p className="text-3xl font-black">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs font-black uppercase text-emerald-500 mb-1">Status de Pagamento</p>
                          <p className="text-3xl font-black text-emerald-400">R$ {selectedRental.entryValue.toLocaleString('pt-BR')} (Pago)</p>
                      </div>
                  </div>

                  <div className="pt-6 space-y-4">
                      <p className="font-bold uppercase text-base text-slate-400 mb-2 tracking-widest">Condições de Locação</p>
                      <div className="text-lg text-justify whitespace-pre-line leading-relaxed italic opacity-80">
                          {type === 'contract' ? contractTerms : `Declaramos para os devidos fins que recebemos de ${selectedRental.customerName} a quantia de R$ ${selectedRental.totalValue.toLocaleString('pt-BR')} quitando integralmente o serviço de locação prestado.`}
                      </div>
                  </div>

                  {contractImage && type === 'contract' && (
                      <div className="pt-10">
                          <p className="font-bold uppercase text-base text-slate-400 mb-4 tracking-widest">Anexo do Contrato</p>
                          <img src={contractImage} className="w-full h-72 object-cover rounded-3xl border" alt="Anexo" />
                      </div>
                  )}
                </div>

                <div className="pt-32 grid grid-cols-2 gap-16 text-center text-base font-black uppercase tracking-widest">
                  <div className="border-t-2 border-slate-900 pt-3">{company.name}</div>
                  <div className="border-t-2 border-slate-900 pt-3">{selectedRental.customerName}</div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3 print:hidden">
              <button 
                onClick={() => handleDownloadPDF('document-print-area', `${type}-${selectedRental.customerName}`)} 
                disabled={isGeneratingPDF}
                className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18}/> {isGeneratingPDF ? 'Gerando PDF...' : 'Baixar Arquivo (PDF)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
