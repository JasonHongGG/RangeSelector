import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (val: 'light' | 'dark') => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  toolMode: 'draw' | 'erase';
  setToolMode: (val: 'draw' | 'erase') => void;
  imageSrc: string | null;
  setImageSrc: (val: string | null) => void;
  color: string;
  setColor: (val: string) => void;
  brushSize: number;
  setBrushSize: (val: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  setTheme: (val) => {
    localStorage.setItem('theme', val);
    set({ theme: val });
  },
  isEditing: false,
  setIsEditing: (val) => set({ isEditing: val }),
  toolMode: 'draw',
  setToolMode: (val) => set({ toolMode: val }),
  imageSrc: null,
  setImageSrc: (val) => set({ imageSrc: val }),
  color: '#ef4444',
  setColor: (val) => set({ color: val }),
  brushSize: 4,
  setBrushSize: (val) => set({ brushSize: val }),
}));
