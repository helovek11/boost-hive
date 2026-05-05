
export type Page = 'dashboard' | 'catalog' | 'campaigns' | 'payments' | 'history' | 'profile';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface Service {
  id: string;
  name: string;
  category: 'TikTok' | 'Instagram' | 'YouTube' | 'X' | 'Twitch' | 'LinkedIn' | 'Other';
  description: string;
  pricePer1k: number;
  minOrder: number;
  maxOrder: number;
  speed: string;
  retention: string;
  quality: string;
  icon?: string;
  badge?: string;
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
