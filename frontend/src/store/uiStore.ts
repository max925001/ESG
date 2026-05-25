// frontend/src/store/uiStore.ts
import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toasts: ToastMessage[];
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  toggleTheme: () => void;
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('esg_theme') as 'light' | 'dark') || 'light',
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebar: (open) => set({ sidebarOpen: open }),

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('esg_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));
