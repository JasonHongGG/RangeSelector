import { create } from 'zustand';

interface AppState {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  imageSrc: string | null;
  setImageSrc: (val: string | null) => void;
  color: string;
  setColor: (val: string) => void;
  brushSize: number;
  setBrushSize: (val: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isEditing: false,
  setIsEditing: (val) => set({ isEditing: val }),
  imageSrc: null,
  setImageSrc: (val) => set({ imageSrc: val }),
  color: '#ef4444',
  setColor: (val) => set({ color: val }),
  brushSize: 4,
  setBrushSize: (val) => set({ brushSize: val }),
}));
