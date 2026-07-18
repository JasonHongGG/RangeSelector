import { useEffect, useState } from "react";
import { MainWindow } from "./windows/MainWindow";
import { SelectionWindow } from "./windows/SelectionWindow";
import { HistoryWindow } from "./windows/HistoryWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "./store/useAppStore";
import { ShortcutService } from "./services/ShortcutService";

function App() {
  const [windowLabel] = useState(() => getCurrentWindow().label);
  const theme = useAppStore(state => state.theme);

  useEffect(() => {
    if (windowLabel === 'main') {
      ShortcutService.init();
    }
    return () => {
      if (windowLabel === 'main') {
        ShortcutService.destroy();
      }
    };
  }, [windowLabel]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        useAppStore.getState().setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    
    // Prevent default right click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [theme]);

  if (windowLabel === 'selection-window') return <SelectionWindow />;
  if (windowLabel === 'history-window') return <HistoryWindow />;
  return <MainWindow />;
}

export default App;
