import { register, unregisterAll, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { CaptureService } from './CaptureService';
import { WindowService } from './WindowService';

export class ShortcutService {
  private static isInitialized = false;

  /**
   * Initializes global shortcuts. Should be called once on app startup.
   */
  public static async init() {
    if (this.isInitialized) return;
    
    try {
      // Clear any existing shortcuts to avoid duplicates on fast-refresh during dev
      await unregisterAll();

      const captureShortcut = 'Shift+Alt+S';
      
      const isSet = await isRegistered(captureShortcut);
      if (!isSet) {
        await register(captureShortcut, async (event) => {
          if (event.state === 'Pressed') {
            console.log(`Global shortcut ${captureShortcut} triggered!`);
            try {
              // Note: CaptureService.performCaptureFlow hides the main window, 
              // triggers the crosshair overlay, and captures the screen.
              // Since the shortcut can be triggered when the app is in the background,
              // this seamlessly initiates the capture workflow.
              await CaptureService.performCaptureFlow();
            } catch (e) {
              console.error("Capture failed from shortcut:", e);
              await WindowService.showMainWindow();
            }
          }
        });
        console.log(`Successfully registered global shortcut: ${captureShortcut}`);
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to register global shortcuts:', error);
    }
  }

  /**
   * Cleans up global shortcuts. Should be called when app unmounts.
   */
  public static async destroy() {
    try {
      await unregisterAll();
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to unregister global shortcuts:', error);
    }
  }
}
