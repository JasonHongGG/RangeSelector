import { useState, useRef, useEffect } from "react";
import { 
  Undo2, Redo2, Copy, Save, XCircle, Eraser, Trash2, ScanText, Loader2
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useOcrStore } from "../../store/useOcrStore";
import { OcrService } from "../../services/OcrService";
import { IconButton } from "../common/IconButton";
import { Tooltip } from "../common/Tooltip";
import { Slider } from "../common/Slider";
import { cn } from "../../utils/cn";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#9ca3af', '#000000'];

interface FloatingToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCopy: () => void;
  onExport: () => void;
  onDiscard: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function FloatingToolbar({
  onUndo, onRedo, onClear, onCopy, onExport, onDiscard, canUndo, canRedo
}: FloatingToolbarProps) {
  const { toolMode, setToolMode, brushSize, setBrushSize, color, setColor } = useAppStore();
  const { status: ocrStatus, isOcrModeActive } = useOcrStore();
  const [activePopover, setActivePopover] = useState<'draw' | 'erase' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToolClick = (mode: 'draw' | 'erase') => {
    if (isOcrModeActive) {
      useOcrStore.getState().reset();
    }
    
    if (toolMode !== mode) {
      setToolMode(mode);
      setActivePopover(null);
    } else {
      setActivePopover(activePopover === mode ? null : mode);
    }
  };

  const isDrawActive = toolMode === 'draw' && !isOcrModeActive;
  const isEraseActive = toolMode === 'erase' && !isOcrModeActive;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-slide-up" ref={toolbarRef}>
      
      {/* Popovers */}
      <div className="relative w-full flex justify-center">
        {activePopover === 'draw' && (
          <div className="absolute bottom-4 left-[-10px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-scale-in origin-bottom-left w-56">
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all duration-300",
                    color === c ? "scale-110 ring-2 ring-gray-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : "hover:scale-110 hover:ring-1 ring-black/20 dark:ring-white/50"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-white/50 font-medium">Brush Size</span>
                <span className="text-xs text-gray-900 dark:text-white/90 font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">{brushSize}px</span>
              </div>
              <Slider 
                min="1" max="30" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
              />
            </div>
          </div>
        )}

        {activePopover === 'erase' && (
          <div className="absolute bottom-4 left-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-scale-in origin-bottom-left w-48">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-white/50 font-medium">Eraser Size</span>
                <span className="text-xs text-gray-900 dark:text-white/90 font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">{brushSize}px</span>
              </div>
              <Slider 
                min="1" max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
              />
            </div>
            <div className="w-full h-px bg-black/10 dark:bg-white/10" />
            <button 
              onClick={() => {
                onClear();
                setActivePopover(null);
              }}
              className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Toolbar */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-1 relative">
        
        {/* Tools */}
        <div className="flex items-center gap-1 mr-1">
          <Tooltip content="Brush & Color">
            <button 
              onClick={() => handleToolClick('draw')}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 relative",
                !isDrawActive && "opacity-50 hover:opacity-100"
              )}
            >
              <div 
                className={cn(
                  "w-4 h-4 rounded-full border border-black/20 dark:border-white/50 transition-all duration-300",
                  isDrawActive ? "scale-125 shadow-sm" : ""
                )}
                style={{ backgroundColor: color }} 
              />
              {isDrawActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-gray-800 dark:bg-white animate-fade-in" />
              )}
            </button>
          </Tooltip>
          
          <Tooltip content="Eraser">
            <button 
              onClick={() => handleToolClick('erase')} 
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 relative",
                isEraseActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 opacity-50 hover:opacity-100"
              )}
            >
              <Eraser size={18} className={isEraseActive ? "scale-110 transition-transform" : "transition-transform"} />
              {isEraseActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-gray-800 dark:bg-white animate-fade-in" />
              )}
            </button>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

        {/* Actions */}
        <Tooltip content="Undo">
          <div>
            <IconButton onClick={onUndo} disabled={!canUndo}>
              <Undo2 size={16} />
            </IconButton>
          </div>
        </Tooltip>
        <Tooltip content="Redo">
          <div>
            <IconButton onClick={onRedo} disabled={!canRedo}>
              <Redo2 size={16} />
            </IconButton>
          </div>
        </Tooltip>

        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

        {/* OCR Action */}
        <Tooltip content={isOcrModeActive ? "Turn off OCR" : "Recognize Text"}>
          <div>
            <IconButton 
              onClick={() => {
                if (isOcrModeActive) {
                  useOcrStore.getState().reset();
                } else {
                  OcrService.recognizeText();
                }
              }} 
              className={cn(
                isOcrModeActive 
                  ? "bg-blue-500/15 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:bg-blue-500/25" 
                  : "hover:bg-blue-500/10 hover:text-blue-500 dark:text-gray-400"
              )}
            >
              {ocrStatus === 'recognizing' ? <Loader2 size={16} className="animate-spin" /> : <ScanText size={16} />}
            </IconButton>
          </div>
        </Tooltip>

        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

        {/* IO Actions */}
        <Tooltip content="Copy to Clipboard">
          <IconButton onClick={onCopy} className="hover:bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <Copy size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Export Image">
          <IconButton onClick={onExport} className="hover:bg-green-500/10 text-green-500 dark:text-green-400">
            <Save size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Discard">
          <IconButton onClick={onDiscard} className="hover:bg-red-500/10 text-red-500 dark:text-red-400">
            <XCircle size={16} />
          </IconButton>
        </Tooltip>

      </div>
    </div>
  );
}
