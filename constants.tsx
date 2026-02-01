
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
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', adminOnly: true },
  { label: 'Reservas', icon: <PlusCircle size={20} />, path: '/reservas' },
  { label: 'Brinquedos e Animações', icon: <Star size={20} />, path: '/brinquedos' },
  { label: 'Clientes', icon: <Users size={20} />, path: '/clientes' },
  { label: 'Disponibilidade', icon: <CalendarCheck size={20} />, path: '/disponibilidade' },
  { label: 'Orçamentos', icon: <FileText size={20} />, path: '/orcamentos' },
  { label: 'Financeiro', icon: <Wallet size={20} />, path: '/financeiro', adminOnly: true },
  { label: 'Contratos', icon: <FileSignature size={20} />, path: '/contratos' },
  { label: 'Recibos', icon: <Receipt size={20} />, path: '/recibos' },
  { label: 'Colaboradores', icon: <UsersRound size={20} />, path: '/colaboradores', adminOnly: true },
  { label: 'Configurações', icon: <Settings size={20} />, path: '/configuracoes', adminOnly: true },
];

export const TOY_CATEGORIES = [
  'Infláveis',
  'Animação / Recreação',
  'Eletrônicos',
  'Mesa/Jogos',
  'Cama Elástica',
  'Espaço Kids',
  'Outros'
];
