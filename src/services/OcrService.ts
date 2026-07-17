import { invoke } from '@tauri-apps/api/core';
import { useOcrStore, OcrResponse } from '../store/useOcrStore';
import { useAppStore } from '../store/useAppStore';
import { useUIStore } from '../store/useUIStore';

export class OcrService {
  static async recognizeText(): Promise<void> {
    const store = useOcrStore.getState();
    const { imageSrc } = useAppStore.getState();
    
    if (!imageSrc) return;
    
    store.setStatus('recognizing');
    store.setError(null);
    store.toggleOcrMode();
    
    try {
      const result = await invoke<OcrResponse>('recognize_text', { base64Image: imageSrc });
      store.setResult(result);
      store.setStatus('done');
      if (result.words.length === 0) {
        useUIStore.getState().showNotification('info', 'No text found in image');
      } else {
        useUIStore.getState().showNotification('success', `OCR Complete: found ${result.words.length} words`);
      }
    } catch (e: any) {
      console.error('OCR Error:', e);
      store.setError(e.toString());
      useUIStore.getState().showNotification('error', `OCR Failed: ${e.toString()}`);
    }
  }
}
