import { useState, useRef, useEffect, RefObject } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useCanvasDrawing(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const { color, brushSize, imageSrc } = useAppStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  
  const pointsRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    if (imageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        setCtx(context);
        const img = new globalThis.Image();
        img.onload = () => {
          const dpr = window.devicePixelRatio || 1;
          const PADDING = 150;
          const physPadding = Math.round(PADDING * dpr);

          canvas.width = img.width + physPadding * 2;
          canvas.height = img.height + physPadding * 2;
          
          canvas.style.width = `${(img.width / dpr) + PADDING * 2}px`;
          canvas.style.height = `${(img.height / dpr) + PADDING * 2}px`;
          
          context.drawImage(img, physPadding, physPadding);
          setHistory([context.getImageData(0, 0, canvas.width, canvas.height)]);
          setRedoStack([]);
        };
        img.src = imageSrc;
      }
    }
  }, [imageSrc, canvasRef]);

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
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    
    pointsRef.current = [{x, y}];
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = brushSize * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    
    pointsRef.current.push({x, y});
    const points = pointsRef.current;
    
    if (points.length < 3) {
      const p0 = points[0];
      const p1 = points[1];
      if (p0 && p1) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    ctx.quadraticCurveTo(
      secondLastPoint.x, 
      secondLastPoint.y, 
      lastPoint.x, 
      lastPoint.y
    );
    
    ctx.stroke();
    pointsRef.current = points.slice(-3);
  };

  const stopDrawing = () => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    setIsDrawing(false);
    ctx.closePath();
    pointsRef.current = [];
    const newData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev, newData]);
    setRedoStack([]);
  };

  return {
    isDrawing,
    history,
    redoStack,
    handleUndo,
    handleRedo,
    startDrawing,
    draw,
    stopDrawing
  };
}
