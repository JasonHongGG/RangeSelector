import { ViewportManager } from './ViewportManager';
import { Renderer } from './Renderer';
import { HistoryManager } from './HistoryManager';
import { ToolRegistry } from './ToolRegistry';
import { useAppStore } from '../../store/useAppStore';
import { useOcrStore } from '../../store/useOcrStore';
import { Point } from '../../types';

export class InputController {
  private wrapper: HTMLDivElement;
  private renderer: Renderer;
  private viewportManager: ViewportManager;
  private historyManager: HistoryManager;
  
  private isDrawing: boolean = false;

  constructor(
    wrapper: HTMLDivElement,
    renderer: Renderer,
    viewportManager: ViewportManager,
    historyManager: HistoryManager
  ) {
    this.wrapper = wrapper;
    this.renderer = renderer;
    this.viewportManager = viewportManager;
    this.historyManager = historyManager;
    
    this.bindEvents();
  }

  private bindEvents() {
    const draftCanvas = this.renderer.getDraftCanvas();
    draftCanvas.addEventListener('pointerdown', this.handlePointerDown);
    draftCanvas.addEventListener('pointermove', this.handlePointerMove);
    draftCanvas.addEventListener('pointerup', this.handlePointerUpOrLeave);
    draftCanvas.addEventListener('pointerleave', this.handlePointerUpOrLeave);
  }

  public destroy() {
    const draftCanvas = this.renderer.getDraftCanvas();
    draftCanvas.removeEventListener('pointerdown', this.handlePointerDown);
    draftCanvas.removeEventListener('pointermove', this.handlePointerMove);
    draftCanvas.removeEventListener('pointerup', this.handlePointerUpOrLeave);
    draftCanvas.removeEventListener('pointerleave', this.handlePointerUpOrLeave);
  }

  private getDocumentCoordinates(e: PointerEvent): Point {
    const rect = this.wrapper.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return this.viewportManager.mapScreenToDocument(screenX, screenY);
  }

  private getToolContext() {
    const state = useAppStore.getState();
    return {
      mainCtx: this.renderer.getDrawingCtx(),
      draftCtx: this.renderer.getDraftCtx(),
      color: state.color,
      brushSize: state.brushSize,
    };
  }

  private getActiveTool() {
    const mode = useAppStore.getState().toolMode;
    return ToolRegistry.getInstance().getTool(mode) || ToolRegistry.getInstance().getTool('draw');
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (e.ctrlKey) {
      const rect = this.wrapper.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      if (this.viewportManager.handlePanStart(screenX, screenY)) {
        if (this.wrapper.parentElement) {
          this.wrapper.parentElement.style.cursor = 'grabbing';
        }
        return;
      }
    }
    
    const ocrState = useOcrStore.getState();
    if (ocrState.isOcrModeActive) return; // Readonly when OCR is active
    
    this.isDrawing = true;
    this.renderer.getDraftCanvas().setPointerCapture(e.pointerId);
    
    const draftCtx = this.renderer.getDraftCtx();
    draftCtx.save();
    this.viewportManager.applyToContext(draftCtx, this.renderer.getDpr());
    
    const point = this.getDocumentCoordinates(e);
    const tool = this.getActiveTool();
    if (tool) {
      tool.onPointerDown(point, this.getToolContext(), e);
    }
    
    draftCtx.restore();
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.wrapper.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    if (this.viewportManager.handlePanMove(screenX, screenY)) {
      return;
    }
    
    if (!this.isDrawing) return;
    
    this.renderer.clearDraft();
    
    const draftCtx = this.renderer.getDraftCtx();
    draftCtx.save();
    this.viewportManager.applyToContext(draftCtx, this.renderer.getDpr());
    
    const point = this.getDocumentCoordinates(e);
    const tool = this.getActiveTool();
    if (tool) {
      tool.onPointerMove(point, this.getToolContext(), e);
    }
    
    draftCtx.restore();
  };

  private handlePointerUpOrLeave = (e: PointerEvent) => {
    if (this.viewportManager.handlePanEnd()) {
      if (this.wrapper.parentElement) {
        this.wrapper.parentElement.style.cursor = '';
      }
      return;
    }
    
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.renderer.getDraftCanvas().releasePointerCapture(e.pointerId);
    
    this.renderer.clearDraft();
    
    const point = this.getDocumentCoordinates(e);
    const drawingCtx = this.renderer.getDrawingCtx();
    
    drawingCtx.save();
    drawingCtx.scale(this.renderer.getDpr(), this.renderer.getDpr());
    
    const tool = this.getActiveTool();
    if (tool) {
      tool.onPointerUp(point, this.getToolContext(), e);
    }
    drawingCtx.restore();
    
    const drawingCanvas = this.renderer.getDrawingCanvas();
    const newData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    this.historyManager.push(newData);
    
    this.renderer.render(this.viewportManager);
  };
}
