import { useState, useEffect } from "react";
import TitleBar from "../components/TitleBar";
import { Copy, Trash2, History } from "lucide-react";
import { HistoryService } from "../services/HistoryService";
import { WindowService } from "../services/WindowService";
import { ClipboardService } from "../services/ClipboardService";
import { useUIStore } from "../store/useUIStore";
import { Tooltip } from "../components/common/Tooltip";
import { HistoryItem } from "../core/types";

function HistoryItemComponent({ item, onSelect, onDelete }: { item: HistoryItem, onSelect: (path: string) => void, onDelete: (id: string) => void }) {
  const showNotification = useUIStore(state => state.showNotification);
  const [src, setSrc] = useState<string | null>(null);
  const [blobCache, setBlobCache] = useState<Blob | null>(null);

  useEffect(() => {
    HistoryService.readHistoryImage(item.path)
      .then(bytes => {
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
        setBlobCache(blob);
        setSrc(URL.createObjectURL(blob));
      })
      .catch(console.error);
  }, [item.path]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!blobCache) return;
    try {
      await ClipboardService.copyImageToClipboardFromBlob(blobCache);
      showNotification('success', 'Image copied to clipboard');
    } catch (err) {
      console.error("Copy failed", err);
      showNotification('error', 'Failed to copy image');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <div 
      className="aspect-video bg-gray-100 dark:bg-[#1a1c23] rounded-xl overflow-hidden cursor-pointer relative group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] shadow-md border border-black/5 dark:border-white/5"
      onClick={() => onSelect(item.path)}
    >
      {src ? (
        <img 
          src={src} 
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
          alt="History item" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-black/40">
          <span className="text-gray-400 dark:text-white/30 text-xs animate-pulse font-mono">Loading...</span>
        </div>
      )}
      
      {/* Dark Gradient Overlay for Timestamp */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none opacity-80" />
      
      {/* Timestamp */}
      <span className="absolute bottom-3 left-3 text-white/90 text-[10px] font-mono tracking-wider drop-shadow-md z-10 pointer-events-none">
        {item.timestamp}
      </span>

      {/* Floating Action Buttons */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-20">
        <Tooltip content="Copy to clipboard" delay={200}>
          <button 
            onClick={handleCopy} 
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/20 hover:bg-blue-500/80 hover:border-blue-400 hover:scale-110 hover:text-white transition-all shadow-lg" 
          >
            <Copy size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Delete" delay={200}>
          <button 
            onClick={handleDelete} 
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/20 hover:bg-red-500/80 hover:border-red-400 hover:scale-110 hover:text-white transition-all shadow-lg" 
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export function HistoryWindow() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showNotification = useUIStore(state => state.showNotification);

  useEffect(() => {
    HistoryService.getHistoryList()
      .then(res => setHistory(res))
      .catch(e => setErrorMsg(String(e)));
  }, []);

  const handleSelect = async (path: string) => {
    try {
      const bytes = await HistoryService.readHistoryImage(path);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await HistoryService.emitLoadHistory(dataUrl);
        await WindowService.showMainWindow();
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await HistoryService.deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      showNotification('success', 'History item deleted');
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to delete history item');
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
