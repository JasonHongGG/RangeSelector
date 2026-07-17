import { Point } from '../types';
import { ToolAction } from './ToolAction';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';
import { HistoryManager } from './HistoryManager';
import { ViewportManager } from './ViewportManager';

export class CanvasEngine {
  private mainCanvas: HTMLCanvasElement;
  private draftCanvas: HTMLCanvasElement;
  private wrapper: HTMLDivElement;
  
  private mainCtx: CanvasRenderingContext2D;
  private draftCtx: CanvasRenderingContext2D;
  
  private historyManager: HistoryManager;
  private viewportManager: ViewportManager;
  
  private currentTool: ToolAction;
  private toolModes: Record<string, ToolAction>;
  
  private isDrawing: boolean = false;
  
  private color: string = '#ef4444';
  private brushSize: number = 4;

  constructor(wrapper: HTMLDivElement, mainCanvas: HTMLCanvasElement, draftCanvas: HTMLCanvasElement, onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.wrapper = wrapper;
    this.mainCanvas = mainCanvas;
    this.draftCanvas = draftCanvas;
    
    const mCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
    const dCtx = draftCanvas.getContext('2d');
    if (!mCtx || !dCtx) throw new Error("Could not get 2d context");
    
    this.mainCtx = mCtx;
    this.draftCtx = dCtx;
    
    this.historyManager = new HistoryManager(onHistoryChange);
    this.viewportManager = new ViewportManager(wrapper, draftCanvas);
    
    this.toolModes = {
      'draw': new PenTool(),
      'erase': new EraserTool()
    };
    this.currentTool = this.toolModes['draw'];
  }

  public getViewportManager() {
    return this.viewportManager;
  }

  public initImage(imageSrc: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const PADDING = 150;
        const physPadding = Math.round(PADDING * dpr);

        const physWidth = img.width + physPadding * 2;
        const physHeight = img.height + physPadding * 2;
        const cssWidth = (img.width / dpr) + PADDING * 2;
        const cssHeight = (img.height / dpr) + PADDING * 2;

        this.mainCanvas.width = physWidth;
        this.mainCanvas.height = physHeight;
        this.draftCanvas.width = physWidth;
        this.draftCanvas.height = physHeight;
        
        this.wrapper.style.width = `${cssWidth}px`;
        this.wrapper.style.height = `${cssHeight}px`;
        
        this.mainCtx.drawImage(img, physPadding, physPadding);
        
        const baseData = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.historyManager.reset(baseData);
        
        // Auto fit the canvas into the parent container
        const container = this.wrapper.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          this.viewportManager.autoFit(rect.width, rect.height, cssWidth, cssHeight);
        }
        
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
    this.historyManager.undo(this.mainCtx);
  }

  public redo() {
    this.historyManager.redo(this.mainCtx);
  }

  public clear() {
    this.historyManager.clear(this.mainCtx, this.mainCanvas.width, this.mainCanvas.height);
  }

  private getCoordinates(e: PointerEvent): Point {
    return this.viewportManager.mapScreenToCanvas(e);
  }

  private getToolContext() {
    return {
      mainCtx: this.mainCtx,
      draftCtx: this.draftCtx,
      color: this.color,
      brushSize: this.brushSize,
    };
  }

  public handlePointerDown = (e: PointerEvent) => {
    if (this.viewportManager.handlePanStart(e)) {
      return;
    }
    
    this.isDrawing = true;
    this.draftCanvas.setPointerCapture(e.pointerId);
    const point = this.getCoordinates(e);
    this.currentTool.onPointerDown(point, this.getToolContext(), e);
  };

  public handlePointerMove = (e: PointerEvent) => {
    if (this.viewportManager.handlePanMove(e)) {
      return;
    }
    
    if (!this.isDrawing) return;
    const point = this.getCoordinates(e);
    this.currentTool.onPointerMove(point, this.getToolContext(), e);
  };

  public handlePointerUpOrLeave = (e: PointerEvent) => {
    if (this.viewportManager.handlePanEnd()) {
      return;
    }
    
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.draftCanvas.releasePointerCapture(e.pointerId);
    const point = this.getCoordinates(e);
    this.currentTool.onPointerUp(point, this.getToolContext(), e);
    
    // Save to history
    const newData = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.historyManager.push(newData);
  };
}
