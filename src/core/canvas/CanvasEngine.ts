import { HistoryManager } from './HistoryManager';
import { ViewportManager } from './ViewportManager';
import { Renderer } from './Renderer';
import { InputController } from './InputController';
import { ToolRegistry } from './ToolRegistry';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';

export const DOCUMENT_PADDING = 150;

export class CanvasEngine {
  private wrapper: HTMLDivElement;
  private renderer: Renderer;
  private viewportManager: ViewportManager;
  private historyManager: HistoryManager;
  private inputController: InputController;
  
  private resizeObserver: ResizeObserver;
  private dpr: number = 1;

  private logicalImageWidth: number = 0;
  private logicalImageHeight: number = 0;
  private hasImageLoaded: boolean = false;
  private hasAutoFit: boolean = false;

  constructor(
    wrapper: HTMLDivElement, 
    mainCanvas: HTMLCanvasElement, 
    draftCanvas: HTMLCanvasElement, 
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
  ) {
    this.wrapper = wrapper;
    this.dpr = window.devicePixelRatio || 1;

    // 1. Initialize Rendering Pipeline
    this.renderer = new Renderer(mainCanvas, draftCanvas);
    
    // 2. Initialize Managers
    this.historyManager = new HistoryManager(onHistoryChange);
    this.viewportManager = new ViewportManager(() => this.render());
    
    // 3. Initialize Input Controller
    this.inputController = new InputController(
      wrapper, 
      this.renderer, 
      this.viewportManager, 
      this.historyManager
    );

    // 4. Register default tools dynamically
    const registry = ToolRegistry.getInstance();
    if (!registry.hasTool('draw')) registry.registerTool('draw', new PenTool());
    if (!registry.hasTool('erase')) registry.registerTool('erase', new EraserTool());

    // 5. Handle Resize
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        this.updateScreenResolution(entry.contentRect.width, entry.contentRect.height);
      }
    });
    
    if (this.wrapper.parentElement) {
      this.resizeObserver.observe(this.wrapper.parentElement);
      const rect = this.wrapper.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.updateScreenResolution(rect.width, rect.height);
      }
    }
  }

  public destroy() {
    this.resizeObserver.disconnect();
    this.inputController.destroy();
  }

  private updateScreenResolution(width: number, height: number) {
    this.renderer.resize(width, height);
    this.viewportManager.resize(width, height);
    this.tryAutoFit();
    this.render();
  }

  private tryAutoFit() {
    if (this.hasImageLoaded && !this.hasAutoFit) {
      const cw = this.viewportManager.getContainerWidth();
      if (cw > 0) {
        this.viewportManager.autoFit(this.logicalImageWidth, this.logicalImageHeight, DOCUMENT_PADDING);
        this.hasAutoFit = true;
      }
    }
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

        this.renderer.initDocumentSize(physWidth, physHeight);
        
        const backgroundCtx = this.renderer.getBackgroundCtx();
        backgroundCtx.clearRect(0, 0, physWidth, physHeight);
        backgroundCtx.drawImage(img, physPadding, physPadding);
        
        const drawingCtx = this.renderer.getDrawingCtx();
        drawingCtx.clearRect(0, 0, physWidth, physHeight);
        
        const baseData = drawingCtx.getImageData(0, 0, physWidth, physHeight);
        this.historyManager.reset(baseData);
        
        this.logicalImageWidth = img.width / this.dpr;
        this.logicalImageHeight = img.height / this.dpr;

        this.viewportManager.autoFit(this.logicalImageWidth, this.logicalImageHeight, DOCUMENT_PADDING);
        this.hasImageLoaded = true;
        this.tryAutoFit();
        
        resolve();
      };
      img.src = imageSrc;
    });
  }

  public render() {
    this.renderer.render(this.viewportManager);
  }

  public undo() {
    this.historyManager.undo(this.renderer.getDrawingCtx());
    this.render();
  }

  public redo() {
    this.historyManager.redo(this.renderer.getDrawingCtx());
    this.render();
  }

  public clear() {
    const drawingCanvas = this.renderer.getDrawingCanvas();
    this.historyManager.clear(this.renderer.getDrawingCtx(), drawingCanvas.width, drawingCanvas.height);
    this.render();
  }

  public getDocumentCanvas(): HTMLCanvasElement {
    const bg = this.renderer.getBackgroundCanvas();
    const dw = this.renderer.getDrawingCanvas();
    const composite = document.createElement('canvas');
    composite.width = bg.width;
    composite.height = bg.height;
    const ctx = composite.getContext('2d')!;
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(dw, 0, 0);
    return composite;
  }
}

