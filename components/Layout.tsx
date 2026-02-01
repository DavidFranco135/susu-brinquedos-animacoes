
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MENU_ITEMS } from '../constants';
import { LogOut, Menu, X, Camera, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onUpdateUser }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== UserRole.ADMIN) return false;
    return true;
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ ...user, profilePhotoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200/50 shadow-[10px_0_30px_rgba(0,0,0,0.02)] z-30">
        <div className="p-8 flex flex-col items-center border-b border-slate-50">
          <div className="relative group cursor-pointer mb-4" onClick={handlePhotoClick}>
            <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-slate-50 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-slate-300" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 p-2 rounded-2xl shadow-lg border-2 border-white text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={14} />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-black text-slate-800 leading-tight">{user?.name}</h3>
            <span className="text-[10px] font-black uppercase tracking-[2px] text-blue-500 bg-blue-50 px-3 py-1 rounded-full inline-block mt-2">
              {user?.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}
            </span>
          </div>
          {/* Trocar Senha removed from here as requested */}
        </div>
        
        <nav className="flex-1 px-6 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200 font-bold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>
                  {item.icon}
                </span>
                <span className="text-[14px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-red-500 bg-red-50/50 hover:bg-red-50 font-black text-xs uppercase tracking-widest transition-all"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
           {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <UserIcon className="m-auto text-slate-300" />}
        </div>
        <button onClick={toggleSidebar} className="p-2.5 text-slate-600 bg-slate-50 rounded-xl">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={toggleSidebar}/>}

      <aside className={`md:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
        <div className="p-10 flex flex-col items-center border-b">
           <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg mb-4 bg-slate-50 flex items-center justify-center">
              {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <UserIcon className="text-slate-300" size={40}/>}
           </div>
           <h3 className="font-black text-slate-800">{user?.name}</h3>
        </div>
        <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); toggleSidebar(); }}
              className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span className="text-[14px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-red-500 bg-red-50 font-black text-xs uppercase">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10">
          {children}
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
