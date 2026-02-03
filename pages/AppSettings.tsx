import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Função genérica para processar imagem para Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'profile') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'logo') {
          setCompanyData({ ...companyData, logoUrl: base64 });
        } else {
          setUserData({ ...userData, profilePhotoUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulação de delay para feedback visual
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
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Configurações</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[4px] mt-3">Perfil e Sistema</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'A guardar...' : <><Save size={20}/> Salvar Alterações</> }
        </button>
      </header>

      {showSuccess && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} /> <span className="font-black uppercase text-xs tracking-widest">Alterações salvas com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* PERFIL DO UTILIZADOR */}
          <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-8">
              <div 
                onClick={() => profileInputRef.current?.click()}
                className="relative group cursor-pointer"
              >
                <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
                  {userData.profilePhotoUrl ? (
                    <img src={userData.profilePhotoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-slate-300" />
                  )}
                </div>
                <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-3xl text-white">
                  <Upload size={20} />
                </div>
                <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Foto de Perfil</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clique para alterar o seu avatar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none focus:ring-2 focus:ring-blue-500/20" value={userData.name} onChange={e=>setUserData({...userData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail de Acesso</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none" value={userData.email} readOnly />
              </div>
            </div>
          </section>

          {/* DADOS DA EMPRESA */}
          <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ShieldCheck size={24}/></div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dados da Empresa</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Fantasia</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.name} onChange={e=>setCompanyData({...companyData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp de Vendas</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.phone} onChange={e=>setCompanyData({...companyData, phone: e.target.value})} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço Sede</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.address} onChange={e=>setCompanyData({...companyData, address: e.target.value})} />
              </div>
            </div>
          </section>
        </div>

        {/* LOGOMARCA */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="relative w-48 h-48 mb-6 group cursor-pointer"
            >
              <div className="w-full h-full rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {companyData.logoUrl ? (
                  <img src={companyData.logoUrl} className="w-full h-full object-cover" />
                ) : (
                  <CloudUpload size={48} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[48px]">
                <Upload size={32} />
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Logomarca Oficial</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px] mt-2">Usada em Contratos e PDFs</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
