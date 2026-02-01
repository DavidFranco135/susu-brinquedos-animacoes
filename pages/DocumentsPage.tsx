import React, { useState, useRef } from 'react';
import {
  FileSignature,
  Receipt,
  Download,
  X,
  Eye,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Rental, Customer, CompanySettings, User } from '../types';

interface Props {
  type: 'contract' | 'receipt';
  rentals: Rental[];
  customers: Customer[];
  company: CompanySettings;
}

const DocumentsPage: React.FC<Props> = ({ type, rentals, customers, company }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contractImage, setContractImage] = useState<string | null>(null);

  const [contractTerms, setContractTerms] = useState(
    company.contractTerms ||
      `1. OBJETO: A CONTRATADA compromete-se a disponibilizar os brinquedos e equipamentos em perfeito estado.
2. RESPONSABILIDADE: O CONTRATANTE assume inteira responsabilidade por mau uso.
3. CANCELAMENTO: Desistências com menos de 48h não têm estorno do sinal.`
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const Title = type === 'contract' ? 'Contrato de Locação' : 'Recibo de Pagamento';
  const Icon = type === 'contract' ? FileSignature : Receipt;

  // ✅ PDF PROFISSIONAL (SEM CORTAR)
  const handleDownloadPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const html2pdf = (window as any).html2pdf;

    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(element)
      .save();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setContractImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
            <Icon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{Title}s</h1>
            <p className="text-slate-500">Documentação legal baseada em reservas.</p>
          </div>
        </div>

        {type === 'contract' && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest ${
              isEditing
                ? 'bg-emerald-500 text-white'
                : 'bg-white border text-slate-600'
            }`}
          >
            {isEditing ? 'Confirmar Termos' : 'Ajustar Cláusulas'}
          </button>
        )}
      </header>

      {/* EDIÇÃO */}
      {isEditing && type === 'contract' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
          <textarea
            rows={10}
            className="w-full p-6 border rounded-3xl font-bold text-sm"
            value={contractTerms}
            onChange={e => setContractTerms(e.target.value)}
          />

          <div className="space-y-4">
            <div className="w-full h-64 border-2 border-dashed rounded-3xl flex items-center justify-center relative">
              {contractImage ? (
                <img src={contractImage} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={48} className="text-slate-300" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="bg-white rounded-3xl border print:hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Valor</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-4">{r.date}</td>
                <td className="p-4">{r.customerName}</td>
                <td className="p-4 font-bold">
                  R$ {r.totalValue.toLocaleString('pt-BR')}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedRental(r)}
                    className="text-blue-600 font-bold flex gap-2 items-center"
                  >
                    <Eye size={16} /> Visualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DOCUMENTO */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl">
            <div className="p-6 border-b flex justify-between print:hidden">
              <h2 className="font-bold text-xs uppercase">Documento</h2>
              <button onClick={() => setSelectedRental(null)}>
                <X />
              </button>
            </div>

            {/* ⚠️ SEM overflow / SEM height fixa */}
            <div
              id="document-print-area"
              className="p-12 text-slate-800 space-y-8 font-serif"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-black uppercase">{Title}</h1>
                <p className="text-xs">
                  {company.name} — {company.cnpj}
                </p>
              </div>

              <p><strong>Cliente:</strong> {selectedRental.customerName}</p>
              <p>
                <strong>Valor:</strong> R${' '}
                {selectedRental.totalValue.toLocaleString('pt-BR')}
              </p>

              <div className="whitespace-pre-line text-sm">
                {type === 'contract'
                  ? contractTerms
                  : `Recebemos o valor acima referente à locação.`}
              </div>

              {contractImage && (
                <img
                  src={contractImage}
                  className="w-full rounded-xl border mt-6"
                />
              )}

              <div className="pt-24 grid grid-cols-2 gap-12 text-center text-xs font-bold uppercase">
                <div className="border-t pt-2">{company.name}</div>
                <div className="border-t pt-2">{selectedRental.customerName}</div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end print:hidden">
              <button
                onClick={() =>
                  handleDownloadPDF(
                    'document-print-area',
                    `${type}-${selectedRental.customerName}`
                  )
                }
                className="bg-slate-900 text-white px-8 py-4 rounded-xl flex gap-2 items-center font-bold"
              >
                <Download size={18} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
