import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";

export class CaptureService {
  static async performCaptureFlow(): Promise<void> {
    await invoke("perform_capture_flow");
  }

  static async getMagnifierRegion(x: number, y: number, size: number): Promise<string> {
    return await invoke<string>("get_magnifier_region", { x, y, size });
  }

  static async cropFromRaw(x: number, y: number, width: number, height: number): Promise<string> {
    return await invoke<string>("crop_from_raw", { x, y, width, height });
  }

  static async onCropResult(callback: (dataUrl: string) => void): Promise<() => void> {
    const unlisten = await listen<{dataUrl: string}>('crop_result', (event) => {
      callback(event.payload.dataUrl);
    });
    return unlisten;
  }

  static async emitCropResult(dataUrl: string): Promise<void> {
    await emit('crop_result', { dataUrl });
  }

  static async onCaptureReady(callback: () => void): Promise<() => void> {
    const unlisten = await listen('capture_ready', () => {
      callback();
    });
    return unlisten;
  }
}
