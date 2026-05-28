import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  notify: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
const nextId = () => `toast-${++counter}-${Date.now()}`;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (message, type = 'info', duration = 4000) => {
    const id = nextId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().notify(msg, 'success'),
  error: (msg: string) => useToastStore.getState().notify(msg, 'error', 6000),
  warning: (msg: string) => useToastStore.getState().notify(msg, 'warning'),
  info: (msg: string) => useToastStore.getState().notify(msg, 'info'),
};
