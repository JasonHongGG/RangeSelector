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

  static async setupCloseHandler(): Promise<() => void> {
    const appWindow = getCurrentWindow();
    const unlisten = await appWindow.onCloseRequested((event) => {
      event.preventDefault();
      appWindow.hide();
    });
    return unlisten;
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
      
      // We no longer dynamically calculate window size based on image size.
      // Set a comfortable default editing size, e.g., 850x600.
      await appWindow.setSize(new LogicalSize(850, 600));
      
      // Center the window after resizing
      await appWindow.center();
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
    try {
      const historyWindow = await WebviewWindow.getByLabel('history-window');
      if (historyWindow) {
        await historyWindow.show();
        await historyWindow.setFocus();
        await historyWindow.unminimize();
      }
    } catch (e) {
      console.error("Failed to open history window", e);
    }
  }
}
