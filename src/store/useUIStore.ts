import { create } from 'zustand';
import { ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface UIState {
  notifications: Notification[];
  showNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  
  // Tooltip State
  tooltipContext: {
    visible: boolean;
    content: ReactNode;
    x: number;
    y: number;
  };
  setTooltip: (content: ReactNode, x: number, y: number) => void;
  hideTooltip: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  notifications: [],
  showNotification: (type, message, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
    
  tooltipContext: {
    visible: false,
    content: null,
    x: 0,
    y: 0,
  },
  setTooltip: (content, x, y) => set({ tooltipContext: { visible: true, content, x, y } }),
  hideTooltip: () => set((state) => ({ tooltipContext: { ...state.tooltipContext, visible: false } })),
}));
