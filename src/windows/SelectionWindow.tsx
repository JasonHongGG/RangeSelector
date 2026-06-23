import { useState, useEffect } from "react";
import { TauriService } from "../services/TauriService";

export function SelectionWindow() {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [zoom, setZoom] = useState(3);

  useEffect(() => {
    TauriService.getLastCapture().then((bytes) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setBgImage(url);
    }).catch(console.error);

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        await TauriService.showMainWindow();
        await TauriService.closeCurrentWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setShowMagnifier(true);
    if (isSelecting) {
      setCurrentPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 1, 50));
    } else {
      setZoom((prev) => Math.max(prev - 1, 3));
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

    if (bgImage) {
      const img = new globalThis.Image();
      img.onload = async () => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(
            img,
            x * dpr, y * dpr, width * dpr, height * dpr,
            0, 0, canvas.width, canvas.height
          );
          const dataUrl = canvas.toDataURL('image/png');
          await TauriService.emitCropResult(dataUrl);
          await TauriService.showMainWindow();
          await TauriService.closeCurrentWindow();
        }
      };
      img.src = bgImage;
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

  // Background position calculations to center the pixel perfectly
  const bgX = (MAGNIFIER_WIDTH / 2) - (zoom / 2) - (mousePos.x * zoom);
  const bgY = ((MAGNIFIER_HEIGHT - 20) / 2) - (zoom / 2) - (mousePos.y * zoom); // 20px is the header height

  return (
    <div
      className="w-screen h-screen cursor-crosshair select-none bg-black/10 animate-fade-in overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: '100% 100%'
      }}
    >
      <div className={`absolute inset-0 bg-black/50 pointer-events-none transition-opacity ${isSelecting ? 'opacity-0' : 'opacity-100'}`} />

      {isSelecting && (
        <div
          className="absolute border border-white/30"
          style={{
            ...selectStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
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

      {/* Full-screen subtle crosshair lines targeting the cursor */}
      {showMagnifier && !isSelecting && (
        <>
          <div className="absolute top-0 bottom-0 w-[1px] bg-white/30 mix-blend-difference pointer-events-none z-40" style={{ left: mousePos.x }} />
          <div className="absolute left-0 right-0 h-[1px] bg-white/30 mix-blend-difference pointer-events-none z-40" style={{ top: mousePos.y }} />
        </>
      )}

      {/* HUD Viewfinder Magnifier */}
      {showMagnifier && bgImage && (
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
          <div className="relative flex-1 bg-[#111]">
            {/* Magnified Image */}
            <div
              className="absolute inset-0 transition-all duration-150 ease-out"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: `${window.innerWidth * zoom}px ${window.innerHeight * zoom}px`,
                backgroundPosition: `${bgX}px ${bgY}px`,
                imageRendering: 'pixelated',
              }}
            />

            {/* Central Hollow Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
               <div 
                 className="transition-all duration-150 ease-out"
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
