import { Point } from '../types';

export class ViewportManager {
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  
  private zoom: number = 1;
  private cameraX: number = 0;
  private cameraY: number = 0;
  
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  
  private readonly minZoom = 0.1;
  private readonly maxZoom = 10;
  
  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  public resize(width: number, height: number) {
    this.containerWidth = width;
    this.containerHeight = height;
    this.onChange();
  }

  public autoFit(imageWidth: number, imageHeight: number, padding: number) {
    // 100% edge-to-edge fit, exactly like Snipping Tool
    const targetWidth = this.containerWidth;
    const targetHeight = this.containerHeight;
    
    if (imageWidth === 0 || imageHeight === 0) return;

    const scaleX = targetWidth / imageWidth;
    const scaleY = targetHeight / imageHeight;
    
    // Calculate the exact scale needed to touch the edges (no arbitrary caps)
    this.zoom = Math.min(scaleX, scaleY);
    
    // Center of the document (image + padding)
    this.cameraX = (imageWidth + padding * 2) / 2;
    this.cameraY = (imageHeight + padding * 2) / 2;
    
    this.onChange();
  }

  public applyToContext(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.containerWidth / 2, this.containerHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.cameraX, -this.cameraY);
  }

  public mapScreenToDocument(screenX: number, screenY: number): Point {
    // Inverse of applyToContext
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
    
    this.onChange();
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
    
    this.onChange();
    return true;
  }

  public handlePanEnd(): boolean {
    if (this.isPanning) {
      this.isPanning = false;
      return true;
    }
    return false;
  }
}

