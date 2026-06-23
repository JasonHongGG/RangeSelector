import { useState, useEffect } from "react";
import { TauriService } from "../services/TauriService";

export function SelectionWindow() {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

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
    if (isSelecting) {
      setCurrentPos({ x: e.clientX, y: e.clientY });
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

  return (
    <div 
      className="w-screen h-screen cursor-crosshair select-none bg-black/10 animate-fade-in overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
    </div>
  );
}
