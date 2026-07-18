import { register, unregisterAll, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { CaptureService } from './CaptureService';
import { WindowService } from './WindowService';

export class ShortcutService {
  private static initPromise: Promise<void> | null = null;

  /**
   * Initializes global shortcuts. Should be called once on app startup.
   */
  public static async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      try {
        // Clear any existing shortcuts to avoid duplicates on fast-refresh during dev
        await unregisterAll();

        const captureShortcut = 'Alt+X';
        
        const isSet = await isRegistered(captureShortcut);
        if (!isSet) {
          await register(captureShortcut, async (event) => {
            if (event.state === 'Pressed') {
              console.log(`Global shortcut ${captureShortcut} triggered!`);
              try {
                await CaptureService.performCaptureFlow();
              } catch (e) {
                console.error("Capture failed from shortcut:", e);
                await WindowService.showMainWindow();
              }
            }
          });
          console.log(`[ShortcutService] Successfully registered global shortcut: ${captureShortcut}`);
        } else {
          console.warn(`[ShortcutService] Shortcut ${captureShortcut} is already registered by this app (or OS).`);
        }
      } catch (error) {
        console.error('Failed to register global shortcuts:', error);
        this.initPromise = null;
      }
    })();
    
    return this.initPromise;
  }

  /**
   * Cleans up global shortcuts. Should be called when app unmounts.
   */
  public static async destroy() {
    try {
      await unregisterAll();
      this.initPromise = null;
    } catch (error) {
      console.error('Failed to unregister global shortcuts:', error);
    }
  }
}
