import { useEffect, useState } from "react";
import { MainWindow } from "./windows/MainWindow";
import { SelectionWindow } from "./windows/SelectionWindow";
import { HistoryWindow } from "./windows/HistoryWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

function App() {
  const [windowLabel] = useState(() => getCurrentWindow().label);

  useEffect(() => {
    // Prevent default right click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  if (windowLabel === 'selection-window') return <SelectionWindow />;
  if (windowLabel === 'history-window') return <HistoryWindow />;
  return <MainWindow />;
}

export default App;
