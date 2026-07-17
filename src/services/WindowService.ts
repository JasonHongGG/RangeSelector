import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export class WindowService {
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
}
