import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export class ClipboardService {
  static async copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const img = await Image.new(new Uint8Array(imageData.data), canvas.width, canvas.height);
    await writeImage(img);
  }

  static async copyImageToClipboardFromBlob(blob: Blob): Promise<void> {
     return new Promise((resolve, reject) => {
       const url = URL.createObjectURL(blob);
       const img = new globalThis.Image();
       img.onload = async () => {
         try {
           const canvas = document.createElement('canvas');
           canvas.width = img.width;
           canvas.height = img.height;
           const ctx = canvas.getContext('2d', { willReadFrequently: true });
           if (ctx) {
             ctx.drawImage(img, 0, 0);
             const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
             const tauriImg = await Image.new(new Uint8Array(imageData.data), canvas.width, canvas.height);
             await writeImage(tauriImg);
             resolve();
           } else {
             reject(new Error("Failed to get context"));
           }
         } catch (e) {
           reject(e);
         } finally {
           URL.revokeObjectURL(url);
         }
       };
       img.onerror = () => reject(new Error("Failed to load image"));
       img.src = url;
     });
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
