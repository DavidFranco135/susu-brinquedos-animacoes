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

  // --- CORREÇÃO AQUI: FILTRO DE ACESSO ---
  const filteredMenuItems = MENU_ITEMS.filter(item => {
    // Se não houver usuário, não mostra nada
    if (!user) return false;

    // Se for ADMIN, tem acesso a tudo
    if (user.role === UserRole.ADMIN) return true;

    // Se for COLABORADOR:
    // 1. Não mostra o que é exclusivo de Admin (como Staff ou Configurações)
    if (item.adminOnly) return false;

    // 2. Verifica se o ID da página está na lista de autorizados do colaborador
    // O 'item.id' deve corresponder ao que salvamos em 'allowedPages' (ex: 'rentals', 'toys')
    return user.allowedPages?.includes(item.id || '');
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Botão Mobile */}
      <button 
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-3 bg-white rounded-2xl shadow-xl text-slate-600 md:hidden"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 pt-12 flex flex-col items-center">
          <div className="relative group cursor-pointer mb-4" onClick={handlePhotoClick}>
            <div className="w-24 h-24 rounded-[32px] bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                <UserIcon size={40} className="text-slate-200" />
              )}
            </div>
            <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[32px]">
              <Camera size={20} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[2px] mb-1">
            {user?.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}
          </p>
          <h3 className="text-lg font-black text-slate-800">{user?.name}</h3>
        </div>

        <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {item.icon}
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-red-500 bg-red-50 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Overlay para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
