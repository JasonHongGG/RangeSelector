import { useState, useEffect, useRef } from "react";
import TitleBar from "./components/TitleBar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

function MainWindow() {
  const [isEditing, setIsEditing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ef4444'); // red-500
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (isEditing && imageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo
          if (redoStack.length > 0 && ctx && canvasRef.current) {
            const next = redoStack[redoStack.length - 1];
            ctx.putImageData(next, 0, 0);
            setHistory(prev => [...prev, next]);
            setRedoStack(prev => prev.slice(0, -1));
          }
        } else {
          // Undo
          if (history.length > 1 && ctx && canvasRef.current) {
            const current = history[history.length - 1];
            setRedoStack(prev => [...prev, current]);
            const previous = history[history.length - 2];
            ctx.putImageData(previous, 0, 0);
            setHistory(prev => prev.slice(0, -1));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, ctx]);

  const startDrawing = (e: React.MouseEvent) => {
    if (!ctx || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
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
    let unlistenFn: () => void;
    
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('crop_result', async (event: any) => {
        const dataUrl = event.payload.dataUrl;
        setImageSrc(dataUrl);
        setIsEditing(true);
        try {
          await invoke('save_history', { base64Data: dataUrl });
        } catch(e) {
          console.error("Failed to save history", e);
        }
      }).then(unlisten => {
        unlistenFn = unlisten;
      });
      
      listen('load_history', async (event: any) => {
        const dataUrl = event.payload.dataUrl;
        setImageSrc(dataUrl);
        setIsEditing(true);
      }).then(() => {
        // ... handled same way ideally, but keeping it simple for now
      });
    });

    return () => {
      if (unlistenFn) unlistenFn();
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
    <div className="flex flex-col h-screen bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <TitleBar />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isEditing ? (
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-white/90">RangeSelector</h1>
            <p className="text-white/50 text-sm">Select an area to capture and edit</p>
            <div className="flex gap-4 mt-4">
              <button 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center font-medium"
                onClick={handleCapture}
              >
                New Capture
              </button>
              <button 
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center font-medium"
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
                    width: 600,
                    height: 500,
                    transparent: true,
                    decorations: false,
                    center: true
                  });
                }}
              >
                History
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="flex-1 bg-black/50 rounded-lg border border-white/5 mb-4 flex items-center justify-center overflow-hidden relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <div className="flex justify-between items-center h-12 bg-white/5 rounded-lg px-4 flex-shrink-0">
              <div className="flex gap-2">
                <button 
                  className={`w-8 h-8 rounded-full bg-red-500 transition-transform ${color === '#ef4444' ? 'scale-110 ring-2 ring-white' : 'hover:scale-110'}`}
                  onClick={() => setColor('#ef4444')}
                />
                <button 
                  className={`w-8 h-8 rounded-full bg-blue-500 transition-transform ${color === '#3b82f6' ? 'scale-110 ring-2 ring-white' : 'hover:scale-110'}`}
                  onClick={() => setColor('#3b82f6')}
                />
                <button 
                  className={`w-8 h-8 rounded-full bg-yellow-500 transition-transform ${color === '#eab308' ? 'scale-110 ring-2 ring-white' : 'hover:scale-110'}`}
                  onClick={() => setColor('#eab308')}
                />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium transition-colors" onClick={async () => {
                  if (canvasRef.current) {
                    const dataUrl = canvasRef.current.toDataURL('image/png');
                    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
                    try {
                      // For image: writeImage(new Uint8Array(...))
                      const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager');
                      await writeImage(bytes);
                      // TODO: maybe show notification
                    } catch (e) {
                      console.error("Copy failed", e);
                    }
                  }
                }}>Copy</button>
                <button className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-sm font-medium transition-colors" onClick={async () => {
                  if (canvasRef.current) {
                    try {
                      const { save } = await import('@tauri-apps/plugin-dialog');
                      // actually writeImage is not in plugin-fs. It's writeFile.
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
                }}>Export</button>
              </div>
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
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
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
      className="w-screen h-screen cursor-crosshair select-none bg-black/10"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: '100% 100%'
      }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      {isSelecting && (
        <div 
          className="absolute border-2 border-blue-500 bg-blue-500/20 backdrop-blur-none"
          style={{
            ...selectStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)', // Dim outside
          }}
        >
          {/* We need to show the clear image inside the selection */}
          {bgImage && (
            <div 
              className="w-full h-full overflow-hidden absolute inset-0"
            >
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

function HistoryWindow() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    invoke<any[]>("get_history_list").then(setHistory).catch(console.error);
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
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <TitleBar title="History" />
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white/90 mb-4">Capture History</h2>
        {history.length === 0 ? (
          <div className="text-white/50 text-center py-10">No history found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {history.map(item => (
              <div 
                key={item.id} 
                className="aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => handleSelect(item.path)}
                title={item.timestamp}
              >
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 p-2 flex items-center justify-center overflow-hidden">
                    <span className="text-[10px] text-white/30 text-center break-all">{item.path.split(/[\/\\]/).pop()}</span>
                  </div>
                  <div className="bg-white/5 px-2 py-1 text-[11px] text-white/50 text-center">
                    {item.timestamp}
                  </div>
                </div>
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
