
import React, { useState } from 'react';
import { Building2, Save, Upload, MapPin, Phone, Mail, Check } from 'lucide-react';
import { CompanySettings as CompanyType } from '../types';

interface Props {
  company: CompanyType;
  setCompany: React.Dispatch<React.SetStateAction<CompanyType>>;
}

const CompanySettings: React.FC<Props> = ({ company, setCompany }) => {
  const [formData, setFormData] = useState<CompanyType>(company);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setCompany(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dados da Empresa</h1>
        <p className="text-slate-500">Informações para contratos e orçamentos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl border text-center space-y-4">
            <div className="w-24 h-24 bg-slate-50 border-2 border-dashed mx-auto rounded-2xl flex items-center justify-center text-slate-300 hover:text-blue-500 cursor-pointer">
              <Upload size={32}/>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Logo da SUSU</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-2xl border space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</label>
              <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label>
              <input value={formData.cnpj} onChange={e=>setFormData({...formData, cnpj: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase text-xs">WhatsApp</label>
              <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail Comercial</label>
              <input value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Endereço Completo</label>
            <input value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="pt-6 border-t flex justify-between items-center">
            {saved ? <span className="text-emerald-500 font-bold flex items-center gap-2"><Check size={18}/> Salvo com sucesso!</span> : <span></span>}
            <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"><Save size={20}/> Salvar Dados</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
