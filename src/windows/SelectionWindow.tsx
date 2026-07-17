import { useState, useEffect, useRef } from "react";
import { CaptureService } from "../services/CaptureService";
import { WindowService } from "../services/WindowService";

export function SelectionWindow() {
  const [isCaptureReady, setIsCaptureReady] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [zoom, setZoom] = useState(3);
  const [magnifierImage, setMagnifierImage] = useState<string | null>(null);
  
  const isFetchingMagRef = useRef(false);

  useEffect(() => {
    let unlistenCapture: (() => void) | undefined;
    
    // Set capture ready when rust background thread finishes naked capture
    CaptureService.onCaptureReady(() => {
      setIsCaptureReady(true);
    }).then(unlisten => {
      unlistenCapture = unlisten;
    });

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCaptureReady(false);
        setMagnifierImage(null);
        await WindowService.showMainWindow();
        await WindowService.hideCurrentWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (unlistenCapture) unlistenCapture();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setMousePos({ x, y });
    setShowMagnifier(true);
    if (isSelecting) {
      setCurrentPos({ x, y });
    }

    // On-Demand Magnifier Region Fetch
    if (isCaptureReady && !isFetchingMagRef.current) {
      isFetchingMagRef.current = true;
      const dpr = window.devicePixelRatio || 1;
      const size = Math.ceil((MAGNIFIER_WIDTH / zoom) * dpr);
      const physX = Math.round(x * dpr);
      const physY = Math.round(y * dpr);
      
      CaptureService.getMagnifierRegion(physX, physY, size).then(dataUrl => {
        setMagnifierImage(dataUrl);
        isFetchingMagRef.current = false;
      }).catch((err) => {
        console.error(err);
        isFetchingMagRef.current = false;
      });
    }
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 1, 20));
    } else {
      setZoom((prev) => Math.max(prev - 1, 2));
    }
    
    // Force mag refresh on zoom
    if (isCaptureReady && !isFetchingMagRef.current) {
       isFetchingMagRef.current = true;
       const dpr = window.devicePixelRatio || 1;
       const size = Math.ceil((MAGNIFIER_WIDTH / zoom) * dpr);
       const physX = Math.round(mousePos.x * dpr);
       const physY = Math.round(mousePos.y * dpr);
       
       CaptureService.getMagnifierRegion(physX, physY, size).then(dataUrl => {
          setMagnifierImage(dataUrl);
          isFetchingMagRef.current = false;
       });
    }
  };

  const handleMouseUp = async () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 10 || height < 10) return;

    if (isCaptureReady) {
      try {
        const dpr = window.devicePixelRatio || 1;
        // The mouse coordinates are logical pixels. We need physical pixels for Rust crop
        const physX = Math.round(x * dpr);
        const physY = Math.round(y * dpr);
        const physW = Math.round(width * dpr);
        const physH = Math.round(height * dpr);
        
        const dataUrl = await CaptureService.cropFromRaw(physX, physY, physW, physH);
        
        await CaptureService.emitCropResult(dataUrl);
        
        setIsCaptureReady(false);
        setMagnifierImage(null);
        
        await WindowService.showMainWindow();
        await WindowService.hideCurrentWindow();
      } catch(err) {
        console.error("Failed to crop from raw:", err);
      }
    }
  };

  const selectStyle = {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  };

  // HUD Magnifier variables
  const MAGNIFIER_WIDTH = 160;
  const MAGNIFIER_HEIGHT = 160;
  const OFFSET = 24;

  let magX = mousePos.x + OFFSET;
  let magY = mousePos.y + OFFSET;

  // Screen boundary collision detection
  if (magX + MAGNIFIER_WIDTH > window.innerWidth) {
    magX = mousePos.x - MAGNIFIER_WIDTH - OFFSET;
  }
  if (magY + MAGNIFIER_HEIGHT > window.innerHeight) {
    magY = mousePos.y - MAGNIFIER_HEIGHT - OFFSET;
  }
  
  if (magX < 0) magX = 0;
  if (magY < 0) magY = 0;

  return (
    <div
      className="w-screen h-screen cursor-crosshair select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={{
        backgroundColor: 'transparent' // Completely transparent, we see the real desktop
      }}
    >
      <div className={`absolute inset-0 bg-black/30 pointer-events-none transition-opacity ${isSelecting ? 'opacity-0' : 'opacity-100'}`} />

      {isSelecting && (
        <div
          className="absolute border border-white/30"
          style={{
            ...selectStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-blue-400" />
          <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-blue-400" />
          <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-blue-400" />
          <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-blue-400" />

          <div className="absolute -top-7 left-0 bg-black/70 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded font-mono tracking-wider border border-white/10 opacity-80 whitespace-nowrap">
            {Math.round(selectStyle.width)} × {Math.round(selectStyle.height)}
          </div>
        </div>
      )}

      {/* HUD Viewfinder Magnifier */}
      {showMagnifier && isCaptureReady && magnifierImage && (
        <div
          className="absolute pointer-events-none z-50 bg-[#111] border border-[#444] shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          style={{
            left: magX,
            top: magY,
            width: MAGNIFIER_WIDTH,
            height: MAGNIFIER_HEIGHT,
          }}
        >
          {/* Header Bar */}
          <div className="h-5 bg-[#222] border-b border-[#444] flex items-center justify-between px-2 shrink-0">
             <span className="text-[#888] text-[9px] font-mono tracking-wider">HUD_VIEW</span>
             <span className="text-[#ccc] text-[9px] font-mono tracking-wider">{zoom}X</span>
          </div>

          {/* Image Container */}
          <div className="relative flex-1 bg-[#111] flex items-center justify-center">
            {/* Magnified Image */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${magnifierImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            />

            {/* Central Hollow Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
               <div 
                 style={{ 
                   width: zoom, 
                   height: zoom, 
                   boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 0 0 2px rgba(0,0,0,0.6)' 
                 }} 
               />
               
               {/* Minimalist HUD Cross lines (optional, adds to the aesthetic) */}
               <div className="absolute w-[1px] h-2 bg-white/50 top-0 left-1/2 -translate-x-1/2" />
               <div className="absolute w-[1px] h-2 bg-white/50 bottom-0 left-1/2 -translate-x-1/2" />
               <div className="absolute h-[1px] w-2 bg-white/50 left-0 top-1/2 -translate-y-1/2" />
               <div className="absolute h-[1px] w-2 bg-white/50 right-0 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
