import { Point } from '../types';

export interface ViewportState {
  zoom: number;
  cameraX: number;
  cameraY: number;
  containerWidth: number;
  containerHeight: number;
  transformString: string;
}

type Subscriber = (state: ViewportState) => void;

export class ViewportManager {
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  
  private zoom: number = 1;
  private cameraX: number = 0;
  private cameraY: number = 0;
  
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  
  private subscribers: Set<Subscriber> = new Set();
  
  private readonly minZoom = 0.1;
  private readonly maxZoom = 10;
  
  private onRenderNeeded: () => void;

  constructor(onRenderNeeded: () => void) {
    this.onRenderNeeded = onRenderNeeded;
  }

  public getContainerWidth(): number { return this.containerWidth; }
  public getContainerHeight(): number { return this.containerHeight; }
  public getZoom(): number { return this.zoom; }
  public getCameraX(): number { return this.cameraX; }
  public getCameraY(): number { return this.cameraY; }

  public resize(width: number, height: number) {
    this.containerWidth = width;
    this.containerHeight = height;
    this.notifySubscribers();
    this.onRenderNeeded();
  }

  public autoFit(imageWidth: number, imageHeight: number, padding: number) {
    const targetWidth = this.containerWidth;
    const targetHeight = this.containerHeight;
    
    if (imageWidth === 0 || imageHeight === 0) return;

    const scaleX = targetWidth / imageWidth;
    const scaleY = targetHeight / imageHeight;
    
    this.zoom = Math.min(1, scaleX, scaleY);
    
    this.cameraX = (imageWidth + padding * 2) / 2;
    this.cameraY = (imageHeight + padding * 2) / 2;
    
    this.notifySubscribers();
    this.onRenderNeeded();
  }

  public applyToContext(ctx: CanvasRenderingContext2D, dpr: number = 1) {
    const offsetX = Math.round((this.containerWidth / 2 - this.cameraX * this.zoom) * dpr);
    const offsetY = Math.round((this.containerHeight / 2 - this.cameraY * this.zoom) * dpr);
    
    ctx.translate(offsetX, offsetY);
    ctx.scale(this.zoom * dpr, this.zoom * dpr);
  }

  public mapScreenToDocument(screenX: number, screenY: number): Point {
    const docX = (screenX - this.containerWidth / 2) / this.zoom + this.cameraX;
    const docY = (screenY - this.containerHeight / 2) / this.zoom + this.cameraY;
    return { x: docX, y: docY };
  }

  public handleWheel(e: WheelEvent, screenX: number, screenY: number) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    let newZoom = this.zoom * Math.exp(delta);
    
    newZoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));
    if (newZoom === this.zoom) return;

    const pointBefore = this.mapScreenToDocument(screenX, screenY);
    this.zoom = newZoom;
    const pointAfter = this.mapScreenToDocument(screenX, screenY);
    
    this.cameraX += pointBefore.x - pointAfter.x;
    this.cameraY += pointBefore.y - pointAfter.y;
    
    this.notifySubscribers();
    this.onRenderNeeded();
  }

  public handlePanStart(screenX: number, screenY: number): boolean {
    this.isPanning = true;
    this.lastPanX = screenX;
    this.lastPanY = screenY;
    return true;
  }

  public handlePanMove(screenX: number, screenY: number): boolean {
    if (!this.isPanning) return false;
    const dx = screenX - this.lastPanX;
    const dy = screenY - this.lastPanY;
    
    this.cameraX -= dx / this.zoom;
    this.cameraY -= dy / this.zoom;
    
    this.lastPanX = screenX;
    this.lastPanY = screenY;
    
    this.notifySubscribers();
    this.onRenderNeeded();
    return true;
  }

  public handlePanEnd(): boolean {
    if (this.isPanning) {
      this.isPanning = false;
      return true;
    }
    return false;
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => this.subscribers.delete(callback);
  }

  private getState(): ViewportState {
    return {
      zoom: this.zoom,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      containerWidth: this.containerWidth,
      containerHeight: this.containerHeight,
      transformString: `translate(${this.containerWidth / 2}px, ${this.containerHeight / 2}px) scale(${this.zoom}) translate(${-this.cameraX}px, ${-this.cameraY}px)`
    };
  }

  private notifySubscribers() {
    const state = this.getState();
    for (const sub of this.subscribers) {
      sub(state);
    }
  }
}

