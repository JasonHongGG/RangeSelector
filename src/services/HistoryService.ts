import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { HistoryItem } from "../types";

export class HistoryService {
  static async saveHistory(base64Data: string): Promise<string> {
    const id = await invoke<string>("save_history", { base64Data });
    await emit('history-updated');
    return id;
  }

  static async getHistoryList(): Promise<HistoryItem[]> {
    return await invoke<HistoryItem[]>("get_history_list");
  }

  static async readHistoryImage(path: string): Promise<number[]> {
    return await invoke<number[]>("read_history_image", { path });
  }

  static async deleteHistory(id: string): Promise<void> {
    await invoke("delete_history", { id });
    await emit('history-updated');
  }

  static async onLoadHistory(callback: (dataUrl: string) => void): Promise<() => void> {
    const unlisten = await listen<{dataUrl: string}>('load_history', (event) => {
      callback(event.payload.dataUrl);
    });
    return unlisten;
  }

  static async emitLoadHistory(dataUrl: string): Promise<void> {
    await emit('load_history', { dataUrl });
  }
}
