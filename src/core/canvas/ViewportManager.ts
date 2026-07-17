import { Point } from '../types';

export class ViewportManager {
  private wrapper: HTMLDivElement;
  private canvasElement: HTMLCanvasElement;
  
  private scale: number = 1;
  private translateX: number = 0;
  private translateY: number = 0;
  
  private isPanning: boolean = false;
  private lastPanPoint: Point | null = null;
  
  private readonly minScale = 0.1;
  private readonly maxScale = 10;
  private readonly zoomSensitivity = 0.002;

  constructor(wrapper: HTMLDivElement, canvasElement: HTMLCanvasElement) {
    this.wrapper = wrapper;
    this.canvasElement = canvasElement;
    this.applyTransform();
  }

  private applyTransform() {
    this.wrapper.style.transformOrigin = '0 0';
    this.wrapper.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  public autoFit(containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number) {
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    this.scale = Math.min(scaleX, scaleY, 1) * 0.95; // 95% to give a tiny margin
    
    this.translateX = (containerWidth - contentWidth * this.scale) / 2;
    this.translateY = (containerHeight - contentHeight * this.scale) / 2;
    this.applyTransform();
  }

  public handleWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    
    const container = this.wrapper.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    const delta = -e.deltaY * this.zoomSensitivity;
    let newScale = this.scale * Math.exp(delta);
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    
    const scaleRatio = newScale / this.scale;
    this.translateX = mouseX - (mouseX - this.translateX) * scaleRatio;
    this.translateY = mouseY - (mouseY - this.translateY) * scaleRatio;
    this.scale = newScale;
    
    this.applyTransform();
  }

  public handlePanStart(e: PointerEvent): boolean {
    if (!e.ctrlKey) return false;
    this.isPanning = true;
    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    if (this.wrapper.parentElement) {
      this.wrapper.parentElement.style.cursor = 'grabbing';
    }
    return true;
  }

  public handlePanMove(e: PointerEvent): boolean {
    if (!this.isPanning || !this.lastPanPoint) return false;
    
    const dx = e.clientX - this.lastPanPoint.x;
    const dy = e.clientY - this.lastPanPoint.y;
    
    this.translateX += dx;
    this.translateY += dy;
    this.lastPanPoint = { x: e.clientX, y: e.clientY };
    
    this.applyTransform();
    return true;
  }

  public handlePanEnd(): boolean {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPanPoint = null;
      if (this.wrapper.parentElement) {
        this.wrapper.parentElement.style.cursor = '';
      }
      return true;
    }
    return false;
  }

  /**
   * maps physical screen coordinates to canvas CSS coordinates perfectly.
   */
  public mapScreenToCanvas(e: PointerEvent): Point {
    const rect = this.canvasElement.getBoundingClientRect();
    // Using rect size directly gives us the CSS pixels because clientX/Y are in CSS pixels
    // The ratio gives us the mapping to actual canvas internal coordinate
    const x = (e.clientX - rect.left) * (this.canvasElement.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvasElement.height / rect.height);
    return { x, y };
  }
}
