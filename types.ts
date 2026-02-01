
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  profilePhotoUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  cnpj?: string;
  cpf?: string;
  isCompany?: boolean;
  createdAt: string;
}

export enum ToyStatus {
  AVAILABLE = 'Disponível',
  RESERVED = 'Reservado',
  MAINTENANCE = 'Manutenção'
}

export interface Toy {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string;
  status: ToyStatus;
  imageUrl: string;
  description?: string;
}

export enum RentalStatus {
  PENDING = 'Pendente',
  CONFIRMED = 'Confirmado',
  COMPLETED = 'Concluído',
  CANCELLED = 'Cancelado'
}

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'DEBITO' | 'CREDITO';

export interface Rental {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  startTime: string;
  endTime: string;
  eventAddress?: string; // Endereço específico do evento
  toyIds: string[];
  totalValue: number;
  entryValue: number;
  paymentMethod?: PaymentMethod;
  installments?: number;
  status: RentalStatus;
  notes?: string;
  additionalService?: string;
  additionalServiceValue?: number;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'INCOME' | 'EXPENSE' | 'EXTRA';
  category: string;
}

export interface CompanySettings {
  name: string;
  description?: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  backupEnabled?: boolean;
  backupFrequency?: number;
  lastBackupDate?: string;
  driveFolderName?: string;
  contractTerms?: string;
}
