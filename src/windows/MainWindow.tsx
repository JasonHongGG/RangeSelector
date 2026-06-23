import { useEffect, useRef } from "react";
import TitleBar from "../components/TitleBar";
import { ScanLine, History, Copy, Save, Undo2, Redo2, XCircle, MousePointer2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { TauriService } from "../services/TauriService";
import { IconButton } from "../components/common/IconButton";
import { ColorPalette } from "../components/toolbar/ColorPalette";
import { getCroppedCanvas } from "../utils/canvasUtils";

export function MainWindow() {
  const { isEditing, setIsEditing, setImageSrc } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { 
    isDrawing, 
    history, 
    redoStack, 
    handleUndo, 
    handleRedo, 
    startDrawing, 
    draw, 
    stopDrawing 
  } = useCanvasDrawing(canvasRef);

  useEffect(() => {
    let isMounted = true;
    let unlistenCrop: (() => void) | undefined;
    let unlistenLoad: (() => void) | undefined;
    
    const setup = async () => {
      const uCrop = await TauriService.onCropResult(async (dataUrl) => {
        setImageSrc(dataUrl);
        setIsEditing(true);
        try {
          await TauriService.saveHistory(dataUrl);
        } catch(e) {
          console.error("Failed to save history", e);
        }
      });
      if (!isMounted) uCrop();
      else unlistenCrop = uCrop;
      
      const uLoad = await TauriService.onLoadHistory((dataUrl) => {
        setImageSrc(dataUrl);
        setIsEditing(true);
      });
      if (!isMounted) uLoad();
      else unlistenLoad = uLoad;
    };
    setup();

    return () => {
      isMounted = false;
      if (unlistenCrop) unlistenCrop();
      if (unlistenLoad) unlistenLoad();
    };
  }, [setImageSrc, setIsEditing]);

  const handleCapture = async () => {
    await TauriService.hideCurrentWindow();
    setTimeout(async () => {
      try {
        await TauriService.captureScreen();
        await TauriService.openSelectionWindow();
      } catch (e) {
        console.error("Capture failed:", e);
        await TauriService.showMainWindow();
      }
    }, 200);
  };

  const copyToClipboard = async () => {
    if (canvasRef.current) {
      try {
        const canvas = getCroppedCanvas(canvasRef.current);
        await TauriService.copyCanvasToClipboard(canvas);
      } catch (e) {
        console.error("Copy failed", e);
      }
    }
  };

  const exportImage = async () => {
    if (canvasRef.current) {
      try {
        const canvas = getCroppedCanvas(canvasRef.current);
        await TauriService.exportCanvas(canvas);
      } catch (e) {
        console.error("Export failed", e);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white/95 dark:bg-[#0f1115]/95 backdrop-blur-2xl border border-black/10 dark:border-white/5 rounded-xl overflow-hidden shadow-2xl relative transition-colors selection:bg-blue-500/30">
      <TitleBar>
        <IconButton onClick={handleCapture} title="New Capture">
          <ScanLine size={16} />
        </IconButton>
        <IconButton onClick={() => TauriService.openHistoryWindow()} title="History">
          <History size={16} />
        </IconButton>

        {isEditing && (
          <div className="flex items-center animate-fade-in pl-1 ml-1 border-l border-black/10 dark:border-white/10 gap-1">
            <ColorPalette />

            <IconButton onClick={handleUndo} disabled={history.length <= 1} title="Undo">
              <Undo2 size={16} />
            </IconButton>
            <IconButton onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">
              <Redo2 size={16} />
            </IconButton>

            <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />

            <IconButton onClick={copyToClipboard} title="Copy to Clipboard" className="hover:bg-blue-500/20 text-blue-400 hover:text-blue-300">
              <Copy size={16} />
            </IconButton>
            <IconButton onClick={exportImage} title="Export Image" className="hover:bg-green-500/20 text-green-400 hover:text-green-300">
              <Save size={16} />
            </IconButton>
            <IconButton onClick={() => setIsEditing(false)} title="Discard" className="hover:bg-red-500/20 text-red-400 hover:text-red-300 ml-1">
              <XCircle size={16} />
            </IconButton>
          </div>
        )}
      </TitleBar>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
        {!isEditing ? (
          <div 
            className="flex flex-col items-center justify-center w-full h-full cursor-pointer group animate-fade-in"
            onClick={handleCapture}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-black/5 dark:border-white/5 scale-[1.2] group-hover:border-blue-400/20 transition-all duration-700" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-black/10 dark:border-white/10 scale-150 animate-pulse-slow group-hover:border-blue-500/30 transition-all duration-700" />
              
              <div className="relative w-24 h-24 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/40 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500 overflow-hidden z-10">
                <ScanLine size={32} className="text-gray-400 dark:text-white/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:-translate-y-1 transition-all duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-transparent via-blue-400/20 to-transparent -translate-y-full group-hover:animate-[slide-up_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
            
            <div className="mt-12 flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              <span className="text-[11px] font-bold tracking-[0.2em] text-gray-500 dark:text-white/50 uppercase">Ready to Capture</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full min-h-0 animate-scale-in p-4">
            <div className="flex-1 rounded-lg border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-black/40 shadow-inner flex items-center justify-center overflow-hidden relative cursor-crosshair group">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              {!isDrawing && (
                <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <MousePointer2 size={12} className="text-gray-500 dark:text-white/50" />
                  <span className="text-[10px] text-gray-700 dark:text-white/70 tracking-widest uppercase font-bold">Draw to annotate</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
