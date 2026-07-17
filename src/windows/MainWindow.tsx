import { useEffect, useRef } from "react";
import TitleBar from "../components/TitleBar";
import { ScanLine, History } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { WindowService } from "../services/WindowService";
import { CaptureService } from "../services/CaptureService";
import { HistoryService } from "../services/HistoryService";
import { ClipboardService } from "../services/ClipboardService";
import { IconButton } from "../components/common/IconButton";
import { FloatingToolbar } from "../components/toolbar/FloatingToolbar";
import { getCroppedCanvas } from "../utils/canvasUtils";
import { useUIStore } from "../store/useUIStore";
import { Tooltip } from "../components/common/Tooltip";

export function MainWindow() {
  const { isEditing, setIsEditing, setImageSrc } = useAppStore();
  const showNotification = useUIStore(state => state.showNotification);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { 
    canUndo, 
    canRedo, 
    handleUndo, 
    handleRedo, 
    startDrawing, 
    draw, 
    stopDrawing,
    handleClear,
    getDocumentCanvas
  } = useCanvasDrawing(wrapperRef, mainCanvasRef, draftCanvasRef);

  useEffect(() => {
    let isMounted = true;
    let unlistenCrop: (() => void) | undefined;
    let unlistenLoad: (() => void) | undefined;
    let unlistenClose: (() => void) | undefined;
    
    const setup = async () => {
      const uCrop = await CaptureService.onCropResult(async (dataUrl) => {
        setImageSrc(dataUrl);
        setIsEditing(true);
        try {
          await HistoryService.saveHistory(dataUrl);
        } catch(e) {
          console.error("Failed to save history", e);
        }
      });
      if (!isMounted) uCrop();
      else unlistenCrop = uCrop;
      
      const uLoad = await HistoryService.onLoadHistory((dataUrl) => {
        setImageSrc(dataUrl);
        setIsEditing(true);
      });
      if (!isMounted) uLoad();
      else unlistenLoad = uLoad;
      
      const unlistenCloseEvent = await WindowService.setupCloseHandler();
      if (!isMounted) unlistenCloseEvent();
      else unlistenClose = unlistenCloseEvent;
    };
    setup();

    return () => {
      isMounted = false;
      if (unlistenCrop) unlistenCrop();
      if (unlistenLoad) unlistenLoad();
      if (unlistenClose) unlistenClose();
    };
  }, [setImageSrc, setIsEditing]);

  useEffect(() => {
    if (isEditing) {
      WindowService.setExpandedMode();
    } else {
      WindowService.setCompactMode();
    }
  }, [isEditing]);

  const handleCapture = async () => {
    try {
      await CaptureService.performCaptureFlow();
    } catch (e) {
      console.error("Capture failed:", e);
      await WindowService.showMainWindow();
    }
  };

  const copyToClipboard = async () => {
    const docCanvas = getDocumentCanvas();
    if (docCanvas) {
      try {
        const canvas = getCroppedCanvas(docCanvas);
        await ClipboardService.copyCanvasToClipboard(canvas);
        showNotification('success', 'Image copied to clipboard');
      } catch (e) {
        console.error("Copy failed", e);
        showNotification('error', 'Failed to copy image');
      }
    }
  };

  const exportImage = async () => {
    const docCanvas = getDocumentCanvas();
    if (docCanvas) {
      try {
        const canvas = getCroppedCanvas(docCanvas);
        await ClipboardService.exportCanvas(canvas);
        showNotification('success', 'Image exported successfully');
      } catch (e) {
        console.error("Export failed", e);
        showNotification('error', 'Failed to export image');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white/95 dark:bg-[#0f1115]/95 backdrop-blur-2xl border border-black/10 dark:border-white/5 rounded-xl overflow-hidden shadow-2xl relative transition-colors selection:bg-blue-500/30">
      <TitleBar>
        <Tooltip content="New Capture">
          <IconButton onClick={handleCapture}>
            <ScanLine size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content="History">
          <IconButton onClick={() => WindowService.openHistoryWindow()}>
            <History size={16} />
          </IconButton>
        </Tooltip>
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
            <div className="flex-1 rounded-lg border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-black/40 shadow-inner overflow-hidden relative cursor-crosshair group">
              
              {/* Canvas Wrapper for Viewport Transform */}
              <div 
                ref={wrapperRef}
                className="absolute inset-0 touch-none overflow-hidden"
              >
                {/* Main Canvas: Holds confirmed strokes */}
                <canvas
                  ref={mainCanvasRef}
                  className="absolute inset-0 pointer-events-none drop-shadow-2xl"
                />
                {/* Draft Canvas: Interactive layer for preview strokes */}
                <canvas
                  ref={draftCanvasRef}
                  className="absolute inset-0 touch-none"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>

              <FloatingToolbar 
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClear}
                onCopy={copyToClipboard}
                onExport={exportImage}
                onDiscard={() => setIsEditing(false)}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
