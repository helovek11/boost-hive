export type Page = 'dashboard' | 'catalog' | 'campaigns' | 'payments' | 'orders' | 'history' | 'profile' | 'admin';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  balance?: number;
}

export interface Service {
  id: string;
  name: string;
  nameOriginal: string;
  description: string;
  category: string;
  serviceType?: string;
  pricePer1k: number;
  minOrder: number;
  maxOrder: number;
  speedLabel: string;
  priceTier: 'premium' | 'standard' | 'budget';
  group?: string;
  providerServiceId: string;
}

export interface Order {
  id: string;
  serviceName: string;
  target: string;
  quantity: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  date: string;
  price: number;
}

export interface TerminalMessage {
  id: string;
  timestamp: string;
  type: 'SYSTEM' | 'SUCCESS' | 'INFO' | 'ERROR';
  content: string;
}
