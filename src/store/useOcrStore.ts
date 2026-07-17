import { create } from 'zustand';

export interface OcrWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrResponse {
  lines: OcrLine[];
  text: string;
}

type OcrStatus = 'idle' | 'recognizing' | 'done' | 'error';

interface OcrState {
  status: OcrStatus;
  result: OcrResponse | null;
  errorMsg: string | null;
  isOcrModeActive: boolean;
  
  setStatus: (status: OcrStatus) => void;
  setResult: (result: OcrResponse | null) => void;
  setError: (msg: string | null) => void;
  toggleOcrMode: () => void;
  reset: () => void;
}

export const useOcrStore = create<OcrState>((set) => ({
  status: 'idle',
  result: null,
  errorMsg: null,
  isOcrModeActive: false,
  
  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result }),
  setError: (errorMsg) => set({ errorMsg, status: 'error' }),
  toggleOcrMode: () => set((state) => ({ isOcrModeActive: !state.isOcrModeActive })),
  reset: () => set({ status: 'idle', result: null, errorMsg: null, isOcrModeActive: false }),
}));
