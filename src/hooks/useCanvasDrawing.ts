import { useState, useEffect, RefObject } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CanvasEngine } from '../core/canvas/CanvasEngine';

export function useCanvasDrawing(
  wrapperRef: RefObject<HTMLDivElement | null>,
  mainCanvasRef: RefObject<HTMLCanvasElement | null>,
  draftCanvasRef: RefObject<HTMLCanvasElement | null>
) {
  const { color, brushSize, imageSrc, toolMode, isEditing } = useAppStore();
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (isEditing && wrapperRef.current && mainCanvasRef.current && draftCanvasRef.current && !engine) {
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
      setEngine(null);
    }
  }, [isEditing, wrapperRef, mainCanvasRef, draftCanvasRef, engine]);

  useEffect(() => {
    if (engine && imageSrc) {
      engine.initImage(imageSrc);
    }
  }, [engine, imageSrc]);

  useEffect(() => {
    if (engine) {
      engine.setToolMode(toolMode);
      engine.setColor(color);
      engine.setBrushSize(brushSize);
    }
  }, [engine, toolMode, color, brushSize]);

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
      if (engine && e.ctrlKey) {
        engine.getViewportManager().handleWheel(e);
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
    canUndo,
    canRedo,
    startDrawing: (e: React.PointerEvent) => engine?.handlePointerDown(e.nativeEvent),
    draw: (e: React.PointerEvent) => engine?.handlePointerMove(e.nativeEvent),
    stopDrawing: (e: React.PointerEvent) => engine?.handlePointerUpOrLeave(e.nativeEvent),
    handleUndo: () => engine?.undo(),
    handleRedo: () => engine?.redo(),
    handleClear: () => engine?.clear()
  };
}
