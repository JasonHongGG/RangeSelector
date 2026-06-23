import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X } from 'lucide-react';

interface TitleBarProps {
  title?: string;
  onClose?: () => void;
}

export default function TitleBar({ title = 'RangeSelector', onClose }: TitleBarProps) {
  const appWindow = getCurrentWindow();

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await appWindow.minimize();
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else {
      await appWindow.close();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex justify-between items-center bg-gray-900 border-b border-white/10 px-2 select-none"
    >
      {/* Title Area */}
      <div 
        data-tauri-drag-region 
        className="flex items-center pl-2 pointer-events-none w-full h-full"
      >
        <span className="text-[13px] font-medium text-white/70 tracking-wider">
          {title}
        </span>
      </div>
      
      {/* Window Controls */}
      <div className="flex items-center gap-1">
        <button
          className="flex justify-center items-center w-8 h-8 rounded-md bg-transparent hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          className="flex justify-center items-center w-8 h-8 rounded-md bg-transparent hover:bg-red-500 text-white/50 hover:text-white transition-colors"
          onClick={handleClose}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
