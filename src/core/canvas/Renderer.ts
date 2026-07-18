import { ViewportManager } from './ViewportManager';

export class Renderer {
  private mainCanvas: HTMLCanvasElement;
  private draftCanvas: HTMLCanvasElement;
  private backgroundCanvas: HTMLCanvasElement;
  private drawingCanvas: HTMLCanvasElement;
  
  private mainCtx: CanvasRenderingContext2D;
  private draftCtx: CanvasRenderingContext2D;
  private backgroundCtx: CanvasRenderingContext2D;
  private drawingCtx: CanvasRenderingContext2D;
  
  private dpr: number = 1;

  constructor(mainCanvas: HTMLCanvasElement, draftCanvas: HTMLCanvasElement) {
    this.mainCanvas = mainCanvas;
    this.draftCanvas = draftCanvas;
    
    const mCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
    const dCtx = draftCanvas.getContext('2d');
    if (!mCtx || !dCtx) throw new Error("Could not get 2d context");
    
    this.mainCtx = mCtx;
    this.draftCtx = dCtx;
    
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCtx = this.backgroundCanvas.getContext('2d', { willReadFrequently: true })!;
    
    this.drawingCanvas = document.createElement('canvas');
    this.drawingCtx = this.drawingCanvas.getContext('2d', { willReadFrequently: true })!;
    
    this.dpr = window.devicePixelRatio || 1;
  }

  public getDpr(): number {
    return this.dpr;
  }

  public getBackgroundCanvas(): HTMLCanvasElement {
    return this.backgroundCanvas;
  }

  public getBackgroundCtx(): CanvasRenderingContext2D {
    return this.backgroundCtx;
  }

  public getDrawingCanvas(): HTMLCanvasElement {
    return this.drawingCanvas;
  }

  public getDrawingCtx(): CanvasRenderingContext2D {
    return this.drawingCtx;
  }

  public getDraftCtx(): CanvasRenderingContext2D {
    return this.draftCtx;
  }

  public getDraftCanvas(): HTMLCanvasElement {
    return this.draftCanvas;
  }

  public resize(width: number, height: number) {
    const physWidth = Math.round(width * this.dpr);
    const physHeight = Math.round(height * this.dpr);

    this.mainCanvas.width = physWidth;
    this.mainCanvas.height = physHeight;
    this.mainCanvas.style.width = `${width}px`;
    this.mainCanvas.style.height = `${height}px`;
    
    this.draftCanvas.width = physWidth;
    this.draftCanvas.height = physHeight;
    this.draftCanvas.style.width = `${width}px`;
    this.draftCanvas.style.height = `${height}px`;
  }

  public initDocumentSize(physWidth: number, physHeight: number) {
    this.backgroundCanvas.width = physWidth;
    this.backgroundCanvas.height = physHeight;
    this.drawingCanvas.width = physWidth;
    this.drawingCanvas.height = physHeight;
  }

  public clearDraft() {
    this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
  }

  public render(viewportManager: ViewportManager) {
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    
    this.mainCtx.save();
    
    // Disable smoothing if zooming in or at 100% to keep pixels crisp.
    // Enable smoothing if zooming out to prevent aliasing.
    this.mainCtx.imageSmoothingEnabled = viewportManager.getZoom() < 1.0;
    
    viewportManager.applyToContext(this.mainCtx, this.dpr);
    
    // document canvases are already in physical pixels, so reverse the DPR scale to draw them 1:1
    this.mainCtx.scale(1 / this.dpr, 1 / this.dpr);
    this.mainCtx.drawImage(this.backgroundCanvas, 0, 0);
    this.mainCtx.drawImage(this.drawingCanvas, 0, 0);
    
    this.mainCtx.restore();
  }
}
