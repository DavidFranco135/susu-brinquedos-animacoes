
import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, HardDrive, RefreshCw, CheckCircle, Info, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone } from 'lucide-react';
import { CompanySettings, User } from '../types';

interface Props {
  company: CompanySettings;
  setCompany: (c: CompanySettings) => void;
  user: User;
  onUpdateUser: (u: User) => void;
}

const AppSettings: React.FC<Props> = ({ company, setCompany, user, onUpdateUser }) => {
  const [companyData, setCompanyData] = useState<CompanySettings>(company);
  const [userData, setUserData] = useState<User>(user);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setCompany(companyData);
      onUpdateUser(userData);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Personalização</h1>
          <p className="text-slate-500 font-medium">Configure a identidade e as regras do seu negócio.</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">
          {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
          Salvar Tudo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest text-sm">Dados Corporativos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Razão Social</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={companyData.name} onChange={e=>setCompanyData({...companyData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">CNPJ</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={companyData.cnpj} onChange={e=>setCompanyData({...companyData, cnpj: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Telefone para Contato (WhatsApp)</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                        <input className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={companyData.phone} onChange={e=>setCompanyData({...companyData, phone: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">E-mail Institucional</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                        <input className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={companyData.email} onChange={e=>setCompanyData({...companyData, email: e.target.value})} />
                    </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Endereço da Empresa</label>
                    <textarea rows={2} className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold resize-none" value={companyData.address} onChange={e=>setCompanyData({...companyData, address: e.target.value})} />
                </div>
            </div>
          </section>

          <section className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest text-sm">Meu Perfil de Usuário</h2>
            <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="relative w-28 h-28 group cursor-pointer" onClick={()=>profileInputRef.current?.click()}>
                    <div className="w-full h-full rounded-[32px] overflow-hidden border-4 border-slate-50 shadow-xl bg-slate-100 flex items-center justify-center">
                        {userData.profilePhotoUrl ? <img src={userData.profilePhotoUrl} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-slate-300"/>}
                    </div>
                    <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-[32px]"><Upload size={24}/></div>
                    <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e)=>{
                        const file = e.target.files?.[0];
                        if(file){
                            const reader = new FileReader();
                            reader.onloadend = () => setUserData({...userData, profilePhotoUrl: reader.result as string});
                            reader.readAsDataURL(file);
                        }
                    }} />
                </div>
                <div className="flex-1 w-full space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Seu Nome na Home/Sidebar</label>
                        <input className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold" value={userData.name} onChange={e=>setUserData({...userData, name: e.target.value})} />
                    </div>
                </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
            <section className="bg-white p-8 rounded-[40px] border shadow-sm text-center space-y-6">
                <div className="relative group mx-auto w-40 h-40 cursor-pointer" onClick={()=>logoInputRef.current?.click()}>
                    <div className="w-full h-full rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                        {companyData.logoUrl ? <img src={companyData.logoUrl} className="w-full h-full object-cover" /> : <CloudUpload size={48} className="text-slate-200"/>}
                    </div>
                    <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-[48px]"><Upload size={32}/></div>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e)=>{
                        const file = e.target.files?.[0];
                        if(file){
                            const reader = new FileReader();
                            reader.onloadend = () => setCompanyData({...companyData, logoUrl: reader.result as string});
                            reader.readAsDataURL(file);
                        }
                    }} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800">Logomarca Oficial</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Usada nos contratos e orçamentos</p>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
