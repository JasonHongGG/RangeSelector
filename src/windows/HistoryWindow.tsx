import { useState, useEffect } from "react";
import TitleBar from "../components/TitleBar";
import { Copy, Trash2, History } from "lucide-react";
import { TauriService } from "../services/TauriService";
import { HistoryItem } from "../core/types";

function HistoryItemComponent({ item, onSelect, onDelete }: { item: HistoryItem, onSelect: (path: string) => void, onDelete: (id: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    TauriService.readHistoryImage(item.path)
      .then(bytes => {
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
        setSrc(URL.createObjectURL(blob));
      })
      .catch(console.error);
  }, [item.path]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    try {
      const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager');
      const { Image } = await import('@tauri-apps/api/image');
      
      const img = new globalThis.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const tauriImg = await Image.new(new Uint8Array(imageData.data), canvas.width, canvas.height);
          await writeImage(tauriImg);
        }
      };
      img.src = src;
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <div 
      className="aspect-video bg-gray-100 dark:bg-black/50 rounded-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-shadow relative group"
      onClick={() => onSelect(item.path)}
    >
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="History item" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-400 dark:text-white/30 text-xs animate-pulse">Loading...</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-white/80 dark:bg-black/60 backdrop-blur-sm px-2 py-1.5 text-[11px] text-gray-700 dark:text-white/70 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{item.timestamp}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="hover:text-blue-400 transition-colors" title="Copy to clipboard">
            <Copy size={12} />
          </button>
          <button onClick={handleDelete} className="hover:text-red-400 transition-colors" title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryWindow() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    TauriService.getHistoryList()
      .then(res => setHistory(res))
      .catch(e => setErrorMsg(String(e)));
  }, []);

  const handleSelect = async (path: string) => {
    try {
      const bytes = await TauriService.readHistoryImage(path);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await TauriService.emitLoadHistory(dataUrl);
        await TauriService.showMainWindow();
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await TauriService.deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white/95 dark:bg-[#0f1115]/95 backdrop-blur-2xl border border-black/10 dark:border-white/5 rounded-xl overflow-hidden shadow-2xl transition-colors selection:bg-blue-500/30">
      <TitleBar title="History Library" />
      <div className="flex-1 p-6 overflow-y-auto">
        {errorMsg && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-4 text-xs font-mono break-all border border-red-500/30">
            Error: {errorMsg}
          </div>
        )}
        {history.length === 0 && !errorMsg ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 dark:text-white/30 animate-fade-in">
            <History size={48} className="opacity-20" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold">No captures yet</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 animate-slide-up">
            {history.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                <HistoryItemComponent item={item} onSelect={handleSelect} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
