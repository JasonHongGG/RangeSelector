import { useState, useEffect, useRef } from "react";
import TitleBar from "./components/TitleBar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { ScanLine, History, Copy, Save, Undo2, Redo2, XCircle, MousePointer2 } from "lucide-react";

function MainWindow() {
  const [isEditing, setIsEditing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ef4444'); // red-500
  const [brushSize, setBrushSize] = useState(4);
  const [showPalette, setShowPalette] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (isEditing && imageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        setCtx(context);
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          setHistory([context.getImageData(0, 0, canvas.width, canvas.height)]);
          setRedoStack([]);
        };
        img.src = imageSrc;
      }
    }
  }, [isEditing, imageSrc]);

  const handleUndo = () => {
    if (history.length > 1 && ctx && canvasRef.current) {
      const current = history[history.length - 1];
      setRedoStack(prev => [...prev, current]);
      const previous = history[history.length - 2];
      ctx.putImageData(previous, 0, 0);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0 && ctx && canvasRef.current) {
      const next = redoStack[redoStack.length - 1];
      ctx.putImageData(next, 0, 0);
      setHistory(prev => [...prev, next]);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, ctx]);

  const startDrawing = (e: React.MouseEvent) => {
    if (!ctx || !canvasRef.current) return;
    setShowPalette(false);
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    setIsDrawing(false);
    ctx.closePath();
    const newData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev, newData]);
    setRedoStack([]);
  };

  useEffect(() => {
    let isMounted = true;
    let unlistenCrop: (() => void) | undefined;
    let unlistenLoad: (() => void) | undefined;
    
    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const u1 = await listen('crop_result', async (event: any) => {
        const dataUrl = event.payload.dataUrl;
        setImageSrc(dataUrl);
        setIsEditing(true);
        try {
          await invoke('save_history', { base64Data: dataUrl });
        } catch(e) {
          console.error("Failed to save history", e);
        }
      });
      if (!isMounted) u1(); else unlistenCrop = u1;
      
      const u2 = await listen('load_history', async (event: any) => {
        const dataUrl = event.payload.dataUrl;
        setImageSrc(dataUrl);
        setIsEditing(true);
      });
      if (!isMounted) u2(); else unlistenLoad = u2;
    };
    setup();

    return () => {
      isMounted = false;
      if (unlistenCrop) unlistenCrop();
      if (unlistenLoad) unlistenLoad();
    };
  }, []);

  const handleCapture = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    
    // Give it a brief moment to hide
    setTimeout(async () => {
      try {
        await invoke("capture_screen");
        
        // Check if window already exists, if so, close it
        const existing = await WebviewWindow.getByLabel('selection-window');
        if (existing) await existing.close();

        new WebviewWindow('selection-window', {
          url: '/?window=selection',
          title: 'Selection',
          fullscreen: true,
          transparent: true,
          decorations: false,
          alwaysOnTop: true,
          skipTaskbar: true
        });

      } catch (e) {
        console.error("Capture failed:", e);
        await appWindow.show();
      }
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1115]/95 backdrop-blur-2xl border border-white/5 rounded-xl overflow-hidden shadow-2xl relative transition-colors selection:bg-blue-500/30">
      <TitleBar>
        {/* Primary Actions Always Visible */}
        <button 
          className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
          onClick={handleCapture}
          title="New Capture"
        >
          <ScanLine size={16} />
        </button>
        <button 
          className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
          onClick={async () => {
            const existing = await WebviewWindow.getByLabel('history-window');
            if (existing) {
              await existing.show();
              await existing.setFocus();
              return;
            }
            new WebviewWindow('history-window', {
              url: '/?window=history',
              title: 'History',
              width: 700,
              height: 550,
              transparent: true,
              decorations: false,
              center: true
            });
          }}
          title="History"
        >
          <History size={16} />
        </button>

        {/* Contextual Actions (Visible only when editing) */}
        {isEditing && (
          <div className="flex items-center animate-fade-in pl-1 ml-1 border-l border-white/10 gap-1">
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
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#9ca3af', '#000000'].map(c => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full transition-all duration-300 ${color === c ? 'scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800' : 'hover:scale-110 hover:ring-1 ring-white/50'}`}
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

            <button 
              className={`flex justify-center items-center w-8 h-8 rounded-md transition-all ${history.length > 1 ? 'hover:bg-white/10 text-white/70 hover:text-white hover:scale-105 active:scale-95' : 'text-white/20 cursor-not-allowed'}`}
              onClick={handleUndo}
              disabled={history.length <= 1}
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button 
              className={`flex justify-center items-center w-8 h-8 rounded-md transition-all ${redoStack.length > 0 ? 'hover:bg-white/10 text-white/70 hover:text-white hover:scale-105 active:scale-95' : 'text-white/20 cursor-not-allowed'}`}
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <Redo2 size={16} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button 
              className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all hover:scale-105 active:scale-95"
              onClick={async () => {
                if (canvasRef.current) {
                  try {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager');
                      const { Image } = await import('@tauri-apps/api/image');
                      const img = await Image.new(new Uint8Array(imageData.data), canvas.width, canvas.height);
                      await writeImage(img);
                    }
                  } catch (e) {
                    console.error("Copy failed", e);
                  }
                }
              }}
              title="Copy to Clipboard"
            >
              <Copy size={16} />
            </button>
            <button 
              className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all hover:scale-105 active:scale-95"
              onClick={async () => {
                if (canvasRef.current) {
                  try {
                    const { save } = await import('@tauri-apps/plugin-dialog');
                    const { writeFile } = await import('@tauri-apps/plugin-fs');
                    const path = await save({ filters: [{ name: 'Image', extensions: ['png'] }] });
                    if (path) {
                      const dataUrl = canvasRef.current.toDataURL('image/png');
                      const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
                      await writeFile(path, bytes);
                    }
                  } catch (e) {
                    console.error("Export failed", e);
                  }
                }
              }}
              title="Export Image"
            >
              <Save size={16} />
            </button>
            <button 
              className="flex justify-center items-center w-8 h-8 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all hover:scale-105 active:scale-95 ml-1"
              onClick={() => setIsEditing(false)}
              title="Discard"
            >
              <XCircle size={16} />
            </button>
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
              <div className="absolute inset-0 rounded-full border border-white/5 scale-[1.2] group-hover:border-blue-400/20 transition-all duration-700" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 scale-150 animate-pulse-slow group-hover:border-blue-500/30 transition-all duration-700" />
              
              <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/40 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500 overflow-hidden z-10">
                <ScanLine size={32} className="text-white/20 group-hover:text-blue-400 group-hover:-translate-y-1 transition-all duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-transparent via-blue-400/20 to-transparent -translate-y-full group-hover:animate-[slide-up_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
            
            <div className="mt-12 flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">Ready to Capture</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full min-h-0 animate-scale-in p-4">
            <div className="flex-1 rounded-lg border border-white/5 bg-black/40 shadow-inner flex items-center justify-center overflow-hidden relative cursor-crosshair group">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              {!isDrawing && (
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <MousePointer2 size={12} className="text-white/50" />
                  <span className="text-[10px] text-white/70 tracking-widest uppercase font-bold">Draw to annotate</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionWindow() {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Fetch image from rust state
    invoke<number[]>("get_last_capture").then((bytes) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setBgImage(url);
    }).catch(console.error);

    // Escape to cancel
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const mainWindow = await WebviewWindow.getByLabel('main');
        if (mainWindow) await mainWindow.show();
        await getCurrentWindow().close();
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

    if (width < 10 || height < 10) {
      // Too small, probably a mistake
      return;
    }

    // Crop image
    if (bgImage) {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          // Multiply crop coordinates by the scale factor of the image vs logical screen
          // Alternatively we can use window.devicePixelRatio, but img.width/window.innerWidth is safer if there are multi-monitor differences in the single captured image.
          const scaleX = img.width / window.innerWidth;
          const scaleY = img.height / window.innerHeight;
          
          ctx.drawImage(img, x * scaleX, y * scaleY, width * scaleX, height * scaleY, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          
          import('@tauri-apps/api/event').then(async ({ emit }) => {
            await emit('crop_result', { dataUrl });
            const mainWindow = await WebviewWindow.getByLabel('main');
            if (mainWindow) await mainWindow.show();
            await getCurrentWindow().close();
          });
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
      className="w-screen h-screen cursor-crosshair select-none bg-black/10 animate-fade-in"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: '100% 100%'
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none transition-colors" />
      {isSelecting && (
        <div 
          className="absolute border border-white/30 backdrop-blur-none"
          style={{
            ...selectStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', // Dim outside
          }}
        >
          {/* Corner highlights */}
          <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-blue-400" />
          <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-blue-400" />
          <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-blue-400" />
          <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-blue-400" />
          
          {/* Dimension indicator */}
          <div className="absolute -top-7 left-0 bg-black/70 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded font-mono tracking-wider border border-white/10 opacity-80">
            {Math.round(selectStyle.width)} × {Math.round(selectStyle.height)}
          </div>

          {bgImage && (
            <div className="w-full h-full overflow-hidden absolute inset-0 -z-10">
              <img 
                src={bgImage} 
                className="max-w-none absolute"
                style={{
                  left: -selectStyle.left,
                  top: -selectStyle.top,
                  width: '100vw',
                  height: '100vh',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryItemComponent({ item, onSelect }: { item: any, onSelect: (path: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    invoke<number[]>("read_history_image", { path: item.path })
      .then(bytes => {
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
        setSrc(URL.createObjectURL(blob));
      })
      .catch(console.error);
  }, [item.path]);

  return (
    <div 
      className="aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group"
      onClick={() => onSelect(item.path)}
      title={item.timestamp}
    >
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="History item" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white/30 text-xs animate-pulse">Loading...</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-2 py-1.5 text-[11px] text-white/70 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{item.timestamp}</span>
      </div>
    </div>
  );
}

function HistoryWindow() {
  const [history, setHistory] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    invoke<any[]>("get_history_list")
      .then(res => {
        console.log("get_history_list result:", res);
        setHistory(res);
      })
      .catch(e => {
        console.error("get_history_list error:", e);
        setErrorMsg(String(e));
      });
  }, []);

  const handleSelect = async (path: string) => {
    try {
      const bytes = await invoke<number[]>("read_history_image", { path });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const { emit } = await import('@tauri-apps/api/event');
        await emit('load_history', { dataUrl });
        
        const mainWindow = await WebviewWindow.getByLabel('main');
        if (mainWindow) await mainWindow.show();
        await getCurrentWindow().close();
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f1115]/95 backdrop-blur-2xl border border-white/5 rounded-xl overflow-hidden shadow-2xl transition-colors selection:bg-blue-500/30">
      <TitleBar title="History Library" />
      <div className="flex-1 p-6 overflow-y-auto">
        {errorMsg && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-4 text-xs font-mono break-all border border-red-500/30">
            Error: {errorMsg}
          </div>
        )}
        {history.length === 0 && !errorMsg ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30 animate-fade-in">
            <History size={48} className="opacity-20" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold">No captures yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 animate-slide-up">
            {history.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                <HistoryItemComponent item={item} onSelect={handleSelect} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [windowType, setWindowType] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setWindowType(urlParams.get('window'));
    
    // Prevent default right click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  if (windowType === 'selection') return <SelectionWindow />;
  if (windowType === 'history') return <HistoryWindow />;
  return <MainWindow />;
}

export default App;
