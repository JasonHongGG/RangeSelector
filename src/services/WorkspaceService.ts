import { useAppStore } from '../store/useAppStore';
import { useOcrStore } from '../store/useOcrStore';

export class WorkspaceService {
  /**
   * Centralized method to load a new document (image) into the workspace.
   * Ensures all cross-domain states are properly reset to provide a clean editing environment.
   */
  public static loadDocument(dataUrl: string) {
    // 1. Reset OCR state completely
    useOcrStore.getState().reset();
    
    // 2. Reset App Tool Mode to default (draw)
    useAppStore.getState().setToolMode('draw');
    
    // 3. Load the new image and enter editing mode
    useAppStore.getState().setImageSrc(dataUrl);
    useAppStore.getState().setIsEditing(true);
  }
}
