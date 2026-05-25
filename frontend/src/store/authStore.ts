// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { User } from '../types';
import axios from 'axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (access: string, user: User) => void;
  logout: () => Promise<void>;
  setAccessToken: (access: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setAccessToken: (access) => {
    set({ accessToken: access, isAuthenticated: !!access });
  },

  login: (access, user) => {
    set({ accessToken: access, user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const token = useAuthStore.getState().accessToken;
      await axios.post(`${baseUrl}/api/v1/auth/logout/`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
    } catch (err) {
      console.error('Failed to log out from server:', err);
    } finally {
      set({ accessToken: null, user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => {
    set({ user });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      // Trigger silent token refresh using HTTP-only cookie automatically attached by the browser
      const res = await axios.post(`${baseUrl}/api/v1/auth/refresh/`, {}, { withCredentials: true });
      const access = res.data.data.access;
      
      // Fetch user profile details using the new access token
      const meRes = await axios.get(`${baseUrl}/api/v1/auth/me/`, {
        headers: { Authorization: `Bearer ${access}` },
        withCredentials: true
      });
      
      set({ 
        accessToken: access, 
        user: meRes.data.data, 
        isAuthenticated: true, 
        isInitialized: true 
      });
    } catch (err) {
      // Silent catch - if refresh fails, user remains unauthenticated
      set({ 
        accessToken: null, 
        user: null, 
        isAuthenticated: false, 
        isInitialized: true 
      });
    } finally {
      set({ isLoading: false });
    }
  }
}));
export default useAuthStore;
