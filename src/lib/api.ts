import axios from 'axios';
import { Service, Order } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getServices = async (): Promise<Service[]> => {
  const response = await api.get('/services?limit=500');
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
