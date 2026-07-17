import { useState, useEffect, RefObject } from 'react';
import { useAppStore } from '../store/useAppStore';

import { CanvasEngine } from '../core/canvas/CanvasEngine';

export function useCanvasDrawing(
  wrapperRef: RefObject<HTMLDivElement | null>,
  mainCanvasRef: RefObject<HTMLCanvasElement | null>,
  draftCanvasRef: RefObject<HTMLCanvasElement | null>,
  isWindowReady: boolean
) {
  const { imageSrc, isEditing } = useAppStore();
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (isEditing && isWindowReady && wrapperRef.current && mainCanvasRef.current && draftCanvasRef.current && !engine) {
      const newEngine = new CanvasEngine(
        wrapperRef.current,
        mainCanvasRef.current,
        draftCanvasRef.current,
        (undoable, redoable) => {
          setCanUndo(undoable);
          setCanRedo(redoable);
        }
      );
      setEngine(newEngine);
    } else if (!isEditing) {
      if (engine) {
        engine.destroy();
      }
      setEngine(null);
    }
  }, [isEditing, isWindowReady, wrapperRef, mainCanvasRef, draftCanvasRef, engine]);

  useEffect(() => {
    if (engine && imageSrc) {
      engine.initImage(imageSrc);
    }
  }, [engine, imageSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (engine && e.ctrlKey && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        engine.getViewportManager().handleWheel(e, screenX, screenY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (wrapperRef.current && wrapperRef.current.parentElement) {
      wrapperRef.current.parentElement.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (wrapperRef.current && wrapperRef.current.parentElement) {
        wrapperRef.current.parentElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [engine, wrapperRef]);

  return {
    engine,
    viewportManager: engine?.getViewportManager() || null,
    canUndo,
    canRedo,
    handleUndo: () => engine?.undo(),
    handleRedo: () => engine?.redo(),
    handleClear: () => engine?.clear(),
    getDocumentCanvas: () => engine?.getDocumentCanvas()
  };
}
