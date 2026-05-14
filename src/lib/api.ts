import axios from 'axios';
import { Order } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

interface ServicesResponse {
  data: Service[];
  tiers: { speed: string[]; price: string[] };
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getServices = async (params?: { page?: number; limit?: number }): Promise<ServicesResponse> => {
  const response = await api.get('/services', { params: { limit: 1000, ...params } });
  return response.data;
};

export const getTiers = async (): Promise<{ speed: string[]; price: string[] }> => {
  const response = await api.get('/tiers');
  return response.data;
};

export const createOrder = async (data: { serviceId: string; target: string; quantity: number }): Promise<{ orderId: string }> => {
  const response = await api.post('/orders', data);
  return response.data;
};

export const getCacheStatus = async () => {
  const response = await api.get('/cache-status');
  return response.data;
};

// Auth
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (email: string, password: string, name?: string) => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data;
};

export const getOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export default api;
