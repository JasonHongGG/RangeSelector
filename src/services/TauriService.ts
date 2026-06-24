import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen, emit } from "@tauri-apps/api/event";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { HistoryItem } from "../core/types";

export class TauriService {
  // Capture
  static async performCaptureFlow(): Promise<void> {
    await invoke("perform_capture_flow");
  }

  static async getMagnifierRegion(x: number, y: number, size: number): Promise<string> {
    return await invoke<string>("get_magnifier_region", { x, y, size });
  }

  static async cropFromRaw(x: number, y: number, width: number, height: number): Promise<string> {
    return await invoke<string>("crop_from_raw", { x, y, width, height });
  }

  // History
  static async saveHistory(base64Data: string): Promise<string> {
    return await invoke<string>("save_history", { base64Data });
  }

  static async getHistoryList(): Promise<HistoryItem[]> {
    return await invoke<HistoryItem[]>("get_history_list");
  }

  static async readHistoryImage(path: string): Promise<number[]> {
    return await invoke<number[]>("read_history_image", { path });
  }

  static async deleteHistory(id: string): Promise<void> {
    await invoke("delete_history", { id });
  }

  // Window Management
  static async hideCurrentWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  }

  static async closeCurrentWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }

  static async setCompactMode(): Promise<void> {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(500, 350));
    } catch (e) {
      console.error("Failed to set compact mode", e);
    }
  }

  static async setExpandedMode(): Promise<void> {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(800, 600));
    } catch (e) {
      console.error("Failed to set expanded mode", e);
    }
  }

  static async showMainWindow(): Promise<void> {
    try {
      const mainWindow = await WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
        await mainWindow.unminimize();
      } else {
        // Fallback if label is different
        const { getAllWindows } = await import('@tauri-apps/api/window');
        const windows = await getAllWindows();
        const main = windows.find(w => w.label !== 'selection-window' && w.label !== 'history-window');
        if (main) {
          await main.show();
          await main.setFocus();
          await main.unminimize();
        }
      }
    } catch (e) {
      console.error("Failed to show main window", e);
    }
  }





  static async openHistoryWindow(): Promise<void> {
    const existing = await WebviewWindow.getByLabel('history-window');
    if (existing) {
      await existing.show();
      await existing.setFocus();
      await existing.unminimize();
      return;
    }
    new WebviewWindow('history-window', {
      url: '/?window=history',
      title: 'History',
      width: 700,
      height: 550,
      minWidth: 400,
      minHeight: 300,
      transparent: true,
      decorations: false,
      center: true
    });
  }

  // Events
  static async onCropResult(callback: (dataUrl: string) => void): Promise<() => void> {
    const unlisten = await listen<{dataUrl: string}>('crop_result', (event) => {
      callback(event.payload.dataUrl);
    });
    return unlisten;
  }

  static async onLoadHistory(callback: (dataUrl: string) => void): Promise<() => void> {
    const unlisten = await listen<{dataUrl: string}>('load_history', (event) => {
      callback(event.payload.dataUrl);
    });
    return unlisten;
  }

  static async onCaptureReady(callback: () => void): Promise<() => void> {
    const unlisten = await listen('capture_ready', () => {
      callback();
    });
    return unlisten;
  }

  static async emitCropResult(dataUrl: string): Promise<void> {
    await emit('crop_result', { dataUrl });
  }

  static async emitLoadHistory(dataUrl: string): Promise<void> {
    await emit('load_history', { dataUrl });
  }

  // File and Clipboard IO
  static async copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const img = await Image.new(new Uint8Array(imageData.data), canvas.width, canvas.height);
    await writeImage(img);
  }

  static async exportCanvas(canvas: HTMLCanvasElement): Promise<void> {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const defaultFilename = `screenshot_${timestamp}.png`;

    const path = await save({ 
      filters: [{ name: 'Image', extensions: ['png'] }],
      defaultPath: defaultFilename
    });
    
    if (path) {
      const dataUrl = canvas.toDataURL('image/png');
      const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
      await writeFile(path, bytes);
    }
  }
}
