
import { ToyStatus, RentalStatus } from '../types';

const today = new Date().toISOString().split('T')[0];

export const INITIAL_TOYS = [
  {
    id: 't1',
    name: 'Castelo Inflável Premium',
    category: 'Infláveis',
    price: 350.00,
    quantity: 2,
    size: '4x4m',
    status: ToyStatus.AVAILABLE,
    imageUrl: 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 't2',
    name: 'Cama Elástica Grande',
    category: 'Cama Elástica',
    price: 180.00,
    quantity: 3,
    size: '3.05m',
    status: ToyStatus.AVAILABLE,
    imageUrl: 'https://images.unsplash.com/photo-1574675510427-759292864696?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 't3',
    name: 'Máquina de Algodão Doce',
    category: 'Outros',
    price: 150.00,
    quantity: 1,
    size: 'Balcão',
    status: ToyStatus.MAINTENANCE,
    imageUrl: 'https://images.unsplash.com/photo-1567529684892-0f79df49c5ee?auto=format&fit=crop&q=80&w=400'
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'c1',
    name: 'Maria Silva',
    phone: '11999998888',
    cpf: '123.456.789-00',
    address: 'Rua das Flores, 123 - Centro',
    createdAt: new Date().toISOString()
  },
  {
    id: 'c2',
    name: 'Eventos Kids LTDA',
    phone: '11988887777',
    cnpj: '00.111.222/0001-33',
    isCompany: true,
    address: 'Av. Paulista, 1000 - Bela Vista',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_RENTALS = [
  {
    id: 'r1',
    customerId: 'c1',
    customerName: 'Maria Silva',
    date: today,
    startTime: '14:00',
    endTime: '18:00',
    toyIds: ['t1', 't2'],
    totalValue: 530.00,
    entryValue: 150.00,
    paymentMethod: 'PIX',
    installments: 1,
    status: RentalStatus.CONFIRMED
  }
];
