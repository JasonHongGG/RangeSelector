import { ToolAction, ToolContext } from './ToolAction';
import { Point } from '../../types';

export class EraserTool implements ToolAction {
  private points: Point[] = [];
  private startPoint: Point | null = null;

  private setupContext(ctx: CanvasRenderingContext2D, context: ToolContext, isMain: boolean) {
    const { brushSize } = context;
    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = brushSize * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    
    if (isMain) {
      // On main canvas, eraser actually erases
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      // On draft canvas, eraser draws white (or some color) to show preview
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    if (points.length < 3) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    ctx.quadraticCurveTo(secondLastPoint.x, secondLastPoint.y, lastPoint.x, lastPoint.y);
    ctx.stroke();
  }

  onPointerDown(point: Point, context: ToolContext, e: PointerEvent): void {
    this.points = [point];
    this.startPoint = point;
    this.setupContext(context.draftCtx, context, false);
    
    // Since eraser modifies pixels underneath immediately, we apply it to main context directly for live erasing unless it's a straight line
    if (!e.shiftKey) {
      this.setupContext(context.mainCtx, context, true);
      context.mainCtx.beginPath();
      context.mainCtx.moveTo(point.x, point.y);
      context.mainCtx.lineTo(point.x, point.y);
      context.mainCtx.stroke();
    }
  }

  onPointerMove(point: Point, context: ToolContext, e: PointerEvent): void {
    const { mainCtx, draftCtx } = context;
    
    if (e.shiftKey && this.startPoint) {
      // Straight line preview on draft
      draftCtx.clearRect(0, 0, draftCtx.canvas.width, draftCtx.canvas.height);
      this.setupContext(draftCtx, context, false);
      draftCtx.beginPath();
      draftCtx.moveTo(this.startPoint.x, this.startPoint.y);
      draftCtx.lineTo(point.x, point.y);
      draftCtx.stroke();
    } else {
      // Real time erase on main
      draftCtx.clearRect(0, 0, draftCtx.canvas.width, draftCtx.canvas.height); // clear any straight line preview
      this.points.push(point);
      this.setupContext(mainCtx, context, true);
      this.drawPath(mainCtx, this.points);
      // Keep main points short so we don't redraw the whole history
      if (this.points.length > 3) {
        this.points = this.points.slice(-3);
      }
    }
  }

  onPointerUp(point: Point, context: ToolContext, e: PointerEvent): void {
    const { mainCtx, draftCtx } = context;
    
    if (e.shiftKey && this.startPoint) {
      this.setupContext(mainCtx, context, true);
      mainCtx.beginPath();
      mainCtx.moveTo(this.startPoint.x, this.startPoint.y);
      mainCtx.lineTo(point.x, point.y);
      mainCtx.stroke();
    }
    
    draftCtx.clearRect(0, 0, draftCtx.canvas.width, draftCtx.canvas.height);
    this.points = [];
    this.startPoint = null;
  }
}
