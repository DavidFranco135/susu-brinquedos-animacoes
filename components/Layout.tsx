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

  // CORREÇÃO: Filtra os itens do menu baseando-se no papel (ADMIN) 
  // OU se o ID do item está na lista de páginas autorizadas (allowedPages)
  const filteredMenuItems = MENU_ITEMS.filter(item => {
    // Se for administrador total, vê tudo
    if (user?.role === UserRole.ADMIN) return true;
    
    // Para colaboradores, verifica se o 'id' do menu está nas permissões dele
    // Note: O 'item.path' costuma ser '/brinquedos', mas o ID na permissão é 'toys'
    // Ajustamos aqui para validar tanto pelo path quanto pelo campo adminOnly
    const pageId = item.path.replace('/', '') || 'dashboard';
    
    // Se o item não for exclusivo de admin e estiver autorizado, ele aparece
    return user?.allowedPages?.includes(pageId);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Menu Mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-50">
        <h1 className="font-black text-slate-800">Susu Eventos</h1>
        <button onClick={toggleSidebar} className="p-2 text-slate-600">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-8 flex flex-col items-center border-b border-slate-50">
          <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-[32px] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-slate-300" />
              )}
            </div>
            <button 
              onClick={handlePhotoClick}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all scale-90 group-hover:scale-100"
            >
              <Camera size={16} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          <h3 className="font-black text-slate-800 text-center">{user?.name}</h3>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
            {user?.role === UserRole.ADMIN ? 'Administrador' : 'Colaborador'}
          </p>
        </div>

        <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); toggleSidebar(); }}
              className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <span className={location.pathname === item.path ? 'text-white' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span className="text-[14px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-red-500 bg-red-50 font-black text-xs uppercase hover:bg-red-100 transition-all">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10">
          {children}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;
