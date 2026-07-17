import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X, Sun, Moon } from 'lucide-react';
import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Tooltip } from './common/Tooltip';

interface TitleBarProps {
  title?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function TitleBar({ title = 'RangeSelector', onClose, children }: TitleBarProps) {
  const appWindow = getCurrentWindow();
  const { theme, setTheme } = useAppStore();

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
      className="h-10 flex justify-between items-center bg-transparent px-2 select-none z-50"
    >
      {/* Title Area */}
      <div 
        data-tauri-drag-region 
        className="flex items-center pl-2 pointer-events-none"
      >
        <span className="text-[13px] font-medium text-gray-700 dark:text-white/70 tracking-wider">
          {title}
        </span>
      </div>
      
      {/* Custom Actions & Window Controls */}
      <div className="flex items-center gap-1">
        {children && (
          <div className="flex items-center gap-1 mr-2 border-r border-black/10 dark:border-white/10 pr-2">
            {children}
          </div>
        )}
        {appWindow.label === 'main' && (
          <Tooltip content="Toggle Theme">
            <button
              className="flex justify-center items-center w-8 h-8 rounded-md bg-transparent hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </Tooltip>
        )}
        <Tooltip content="Minimize">
          <button
            className="flex justify-center items-center w-8 h-8 rounded-md bg-transparent hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
            onClick={handleMinimize}
          >
            <Minus size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Close">
          <button
            className="flex justify-center items-center w-8 h-8 rounded-md bg-transparent hover:bg-red-500 text-gray-500 dark:text-white/50 hover:text-white transition-colors"
            onClick={handleClose}
          >
            <X size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
