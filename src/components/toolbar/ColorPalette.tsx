import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#9ca3af', '#000000'];

export function ColorPalette() {
  const [showPalette, setShowPalette] = useState(false);
  const { color, setColor, brushSize, setBrushSize } = useAppStore();

  return (
    <div className="relative">
      <button 
        className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
        onClick={() => setShowPalette(!showPalette)}
        title="Color & Brush"
      >
        <div className="w-4 h-4 rounded-full border border-white/50 shadow-sm transition-colors" style={{ backgroundColor: color }} />
      </button>
      
      {showPalette && (
        <div className="absolute top-10 right-0 bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-4 z-50 animate-scale-in origin-top-right w-56">
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                className={cn(
                  "w-6 h-6 rounded-full transition-all duration-300",
                  color === c ? "scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800" : "hover:scale-110 hover:ring-1 ring-white/50"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50 font-medium">Brush Size</span>
              <span className="text-xs text-white/90 font-mono bg-white/10 px-1.5 py-0.5 rounded">{brushSize}px</span>
            </div>
            <input 
              type="range" 
              min="1" max="30" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
