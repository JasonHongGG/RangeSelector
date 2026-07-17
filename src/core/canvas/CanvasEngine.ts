import { Point } from '../types';
import { ToolAction } from './ToolAction';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';
import { HistoryManager } from './HistoryManager';
import { ViewportManager } from './ViewportManager';

export const DOCUMENT_PADDING = 150;

export class CanvasEngine {
  private mainCanvas: HTMLCanvasElement;
  private draftCanvas: HTMLCanvasElement;
  private wrapper: HTMLDivElement;
  
  private mainCtx: CanvasRenderingContext2D;
  private draftCtx: CanvasRenderingContext2D;
  
  private documentCanvas: HTMLCanvasElement;
  private documentCtx: CanvasRenderingContext2D;
  
  private historyManager: HistoryManager;
  private viewportManager: ViewportManager;
  
  private currentTool: ToolAction;
  private toolModes: Record<string, ToolAction>;
  
  private isDrawing: boolean = false;
  
  private color: string = '#ef4444';
  private brushSize: number = 4;
  
  private resizeObserver: ResizeObserver;
  private dpr: number = 1;

  constructor(wrapper: HTMLDivElement, mainCanvas: HTMLCanvasElement, draftCanvas: HTMLCanvasElement, onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.wrapper = wrapper;
    this.mainCanvas = mainCanvas;
    this.draftCanvas = draftCanvas;
    
    const mCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
    const dCtx = draftCanvas.getContext('2d');
    if (!mCtx || !dCtx) throw new Error("Could not get 2d context");
    
    this.mainCtx = mCtx;
    this.draftCtx = dCtx;
    
    this.documentCanvas = document.createElement('canvas');
    this.documentCtx = this.documentCanvas.getContext('2d', { willReadFrequently: true })!;
    
    this.historyManager = new HistoryManager(onHistoryChange);
    this.viewportManager = new ViewportManager(() => this.render());
    
    this.toolModes = {
      'draw': new PenTool(),
      'erase': new EraserTool()
    };
    this.currentTool = this.toolModes['draw'];

    this.dpr = window.devicePixelRatio || 1;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        this.updateScreenResolution(entry.contentRect.width, entry.contentRect.height);
      }
    });
    if (this.wrapper.parentElement) {
      this.resizeObserver.observe(this.wrapper.parentElement);
      // Synchronously initialize the size to prevent 0-size race condition in autoFit
      const rect = this.wrapper.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.updateScreenResolution(rect.width, rect.height);
      }
    }
  }

  private updateScreenResolution(width: number, height: number) {
    this.mainCanvas.width = width * this.dpr;
    this.mainCanvas.height = height * this.dpr;
    this.mainCanvas.style.width = `${width}px`;
    this.mainCanvas.style.height = `${height}px`;
    
    this.draftCanvas.width = width * this.dpr;
    this.draftCanvas.height = height * this.dpr;
    this.draftCanvas.style.width = `${width}px`;
    this.draftCanvas.style.height = `${height}px`;
    
    this.viewportManager.resize(width * this.dpr, height * this.dpr);
    this.render();
  }

  public getViewportManager() {
    return this.viewportManager;
  }

  public initImage(imageSrc: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const physPadding = Math.round(DOCUMENT_PADDING * this.dpr);

        const physWidth = img.width + physPadding * 2;
        const physHeight = img.height + physPadding * 2;

        this.documentCanvas.width = physWidth;
        this.documentCanvas.height = physHeight;
        
        this.documentCtx.clearRect(0, 0, physWidth, physHeight);
        this.documentCtx.drawImage(img, physPadding, physPadding);
        
        const baseData = this.documentCtx.getImageData(0, 0, physWidth, physHeight);
        this.historyManager.reset(baseData);
        
        this.viewportManager.autoFit(img.width, img.height, DOCUMENT_PADDING);
        
        resolve();
      };
      img.src = imageSrc;
    });
  }

  public render() {
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    
    this.mainCtx.save();
    this.viewportManager.applyToContext(this.mainCtx);
    
    this.mainCtx.drawImage(this.documentCanvas, 0, 0);
    this.mainCtx.restore();
  }

  public getDocumentCanvas(): HTMLCanvasElement {
    return this.documentCanvas;
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
    this.historyManager.undo(this.documentCtx);
    this.render();
  }

  public redo() {
    this.historyManager.redo(this.documentCtx);
    this.render();
  }

  public clear() {
    this.historyManager.clear(this.documentCtx, this.documentCanvas.width, this.documentCanvas.height);
    this.render();
  }

  private getDocumentCoordinates(e: PointerEvent): Point {
    const rect = this.wrapper.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * this.dpr;
    const screenY = (e.clientY - rect.top) * this.dpr;
    return this.viewportManager.mapScreenToDocument(screenX, screenY);
  }

  private getToolContext() {
    return {
      mainCtx: this.documentCtx,
      draftCtx: this.draftCtx,
      color: this.color,
      brushSize: this.brushSize,
    };
  }

  public handlePointerDown = (e: PointerEvent) => {
    if (e.ctrlKey) {
      const rect = this.wrapper.getBoundingClientRect();
      const screenX = (e.clientX - rect.left) * this.dpr;
      const screenY = (e.clientY - rect.top) * this.dpr;
      if (this.viewportManager.handlePanStart(screenX, screenY)) {
        if (this.wrapper.parentElement) {
          this.wrapper.parentElement.style.cursor = 'grabbing';
        }
        return;
      }
    }
    
    this.isDrawing = true;
    this.draftCanvas.setPointerCapture(e.pointerId);
    
    this.draftCtx.save();
    this.viewportManager.applyToContext(this.draftCtx);
    
    const point = this.getDocumentCoordinates(e);
    this.currentTool.onPointerDown(point, this.getToolContext(), e);
    
    this.draftCtx.restore();
  };

  public handlePointerMove = (e: PointerEvent) => {
    const rect = this.wrapper.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * this.dpr;
    const screenY = (e.clientY - rect.top) * this.dpr;
    
    if (this.viewportManager.handlePanMove(screenX, screenY)) {
      return;
    }
    
    if (!this.isDrawing) return;
    
    this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
    
    this.draftCtx.save();
    this.viewportManager.applyToContext(this.draftCtx);
    
    const point = this.getDocumentCoordinates(e);
    this.currentTool.onPointerMove(point, this.getToolContext(), e);
    
    this.draftCtx.restore();
  };

  public handlePointerUpOrLeave = (e: PointerEvent) => {
    if (this.viewportManager.handlePanEnd()) {
      if (this.wrapper.parentElement) {
        this.wrapper.parentElement.style.cursor = '';
      }
      return;
    }
    
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.draftCanvas.releasePointerCapture(e.pointerId);
    
    this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
    
    const point = this.getDocumentCoordinates(e);
    this.currentTool.onPointerUp(point, this.getToolContext(), e);
    
    const newData = this.documentCtx.getImageData(0, 0, this.documentCanvas.width, this.documentCanvas.height);
    this.historyManager.push(newData);
    
    this.render();
  };
}

