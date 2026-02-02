import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Gamepad2, 
  FileText, 
  PlusCircle,
  Wallet,
  FileSignature,
  Receipt,
  UsersRound,
  CalendarCheck,
  Star,
  Settings
} from 'lucide-react';
import { UserRole } from './types';

export const COLORS = {
  primary: '#00D1FF', 
  secondary: '#FF00C7', 
  success: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
  accent: '#A855F7'
};

export interface MenuItem {
  id: string; // Adicionado ID para controle de acesso
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', adminOnly: true },
  { id: 'rentals', label: 'Reservas', icon: <PlusCircle size={20} />, path: '/reservas' },
  { id: 'toys', label: 'Brinquedos e Animações', icon: <Star size={20} />, path: '/brinquedos' },
  { id: 'customers', label: 'Clientes', icon: <Users size={20} />, path: '/clientes' },
  { id: 'availability', label: 'Disponibilidade', icon: <CalendarCheck size={20} />, path: '/disponibilidade' },
  { id: 'budgets', label: 'Orçamentos', icon: <FileText size={20} />, path: '/orcamentos' },
  { id: 'financial', label: 'Financeiro', icon: <Wallet size={20} />, path: '/financeiro', adminOnly: true },
  { id: 'documents', label: 'Contratos', icon: <FileSignature size={20} />, path: '/contratos' },
  { id: 'documents', label: 'Recibos', icon: <Receipt size={20} />, path: '/recibos' },
  { id: 'staff', label: 'Colaboradores', icon: <UsersRound size={20} />, path: '/colaboradores', adminOnly: true },
  { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, path: '/configuracoes', adminOnly: true },
];
