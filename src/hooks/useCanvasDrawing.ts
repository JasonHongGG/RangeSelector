import { useState, useEffect, RefObject } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CanvasEngine } from '../core/canvas/CanvasEngine';

export function useCanvasDrawing(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const { color, brushSize, imageSrc, toolMode, isEditing } = useAppStore();
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (isEditing && canvasRef.current && !engine) {
      const newEngine = new CanvasEngine(canvasRef.current, (undoable, redoable) => {
        setCanUndo(undoable);
        setCanRedo(redoable);
      });
      setEngine(newEngine);
    } else if (!isEditing) {
      setEngine(null);
    }
  }, [isEditing, canvasRef, engine]);

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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  return {
    engine,
    canUndo,
    canRedo,
    startDrawing: (e: React.MouseEvent) => engine?.handleMouseDown(e),
    draw: (e: React.MouseEvent) => engine?.handleMouseMove(e),
    stopDrawing: () => engine?.handleMouseUpOrLeave(),
    handleUndo: () => engine?.undo(),
    handleRedo: () => engine?.redo(),
    handleClear: () => engine?.clear()
  };
}
