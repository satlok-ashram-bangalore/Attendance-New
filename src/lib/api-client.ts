import axios, { AxiosHeaders } from 'axios';
import { supabase } from './supabase/client';
import { User } from '@/features/user/add-user';

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {

    if (config.data instanceof FormData && config.headers) {
      (config.headers as AxiosHeaders).set('Content-Type', 'multipart/form-data');
    }

    const { data: session, error:_ } = await supabase.auth.getSession()

    const token = session.session?.access_token;

    if (token) {
      (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    }


    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// API service functions
export const api = {
  verify: (currentPath: string) => apiClient.post("/api/verify-token", { currentPath }),
  update_password: (password: string) => apiClient.post('/api/priv/reset-password', { new_password: password }),
  create_user: (user: User) => apiClient.post('/api/admin/create-user', { ...user }),
  update_user_role: (id: string, role: string) => apiClient.post('/api/admin/alter-role', { id, role }),
  list_users: (page: number, perPage: number) => apiClient.get(`/api/admin/list-users?page=${page}&per_page=${perPage}`),
};
