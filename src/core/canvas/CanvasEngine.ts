import { Point } from '../types';
import { ToolAction } from './ToolAction';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';
import { HistoryManager } from './HistoryManager';

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private historyManager: HistoryManager;
  
  private currentTool: ToolAction;
  private toolModes: Record<string, ToolAction>;
  
  private isDrawing: boolean = false;
  private points: Point[] = [];
  
  private color: string = '#ef4444';
  private brushSize: number = 4;

  constructor(canvas: HTMLCanvasElement, onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    
    this.historyManager = new HistoryManager(onHistoryChange);
    
    this.toolModes = {
      'draw': new PenTool(),
      'erase': new EraserTool()
    };
    this.currentTool = this.toolModes['draw'];
  }

  public initImage(imageSrc: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const PADDING = 150;
        const physPadding = Math.round(PADDING * dpr);

        this.canvas.width = img.width + physPadding * 2;
        this.canvas.height = img.height + physPadding * 2;
        
        this.canvas.style.width = `${(img.width / dpr) + PADDING * 2}px`;
        this.canvas.style.height = `${(img.height / dpr) + PADDING * 2}px`;
        
        this.ctx.drawImage(img, physPadding, physPadding);
        
        const baseData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.historyManager.reset(baseData);
        resolve();
      };
      img.src = imageSrc;
    });
  }

  public setToolMode(mode: 'draw' | 'erase') {
    if (this.toolModes[mode]) {
      this.currentTool = this.toolModes[mode];
    }
  }

  public setColor(color: string) {
    this.color = color;
  }

  public setBrushSize(size: number) {
    this.brushSize = size;
  }

  public undo() {
    this.historyManager.undo(this.ctx);
  }

  public redo() {
    this.historyManager.redo(this.ctx);
  }

  public clear() {
    this.historyManager.clear(this.ctx, this.canvas.width, this.canvas.height);
  }

  private getCoordinates(e: React.MouseEvent | MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    const canvasRatio = canvasWidth / canvasHeight;
    const rectRatio = rect.width / rect.height;
    
    let renderedWidth = rect.width;
    let renderedHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > rectRatio) {
      renderedHeight = rect.width / canvasRatio;
      offsetY = (rect.height - renderedHeight) / 2;
    } else {
      renderedWidth = rect.height * canvasRatio;
      offsetX = (rect.width - renderedWidth) / 2;
    }

    const x = ((e.clientX - rect.left - offsetX) / renderedWidth) * canvasWidth;
    const y = ((e.clientY - rect.top - offsetY) / renderedHeight) * canvasHeight;
    return { x, y };
  }

  public handleMouseDown = (e: React.MouseEvent | MouseEvent) => {
    this.isDrawing = true;
    const point = this.getCoordinates(e);
    this.points = [point];
    this.currentTool.start(point, { ctx: this.ctx, color: this.color, brushSize: this.brushSize });
  };

  public handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!this.isDrawing) return;
    const point = this.getCoordinates(e);
    this.points.push(point);
    this.currentTool.draw(this.points, { ctx: this.ctx, color: this.color, brushSize: this.brushSize });
    
    // Keep only last 3 points for smoothing
    if (this.points.length > 3) {
      this.points = this.points.slice(-3);
    }
  };

  public handleMouseUpOrLeave = () => {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.currentTool.end({ ctx: this.ctx, color: this.color, brushSize: this.brushSize });
    this.points = [];
    
    // Save to history
    const newData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.historyManager.push(newData);
  };
}
