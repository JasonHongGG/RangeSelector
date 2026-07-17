import { ToolAction, ToolContext } from './ToolAction';
import { Point } from '../../types';

export class PenTool implements ToolAction {
  private points: Point[] = [];
  private startPoint: Point | null = null;

  private setupContext(ctx: CanvasRenderingContext2D, context: ToolContext) {
    const { color, brushSize } = context;
    const dpr = window.devicePixelRatio || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'source-over';
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

  onPointerDown(point: Point, context: ToolContext, _e: PointerEvent): void {
    this.points = [point];
    this.startPoint = point;
    this.setupContext(context.draftCtx, context);
    
    // Draw initial dot on draft
    context.draftCtx.beginPath();
    context.draftCtx.moveTo(point.x, point.y);
    context.draftCtx.lineTo(point.x, point.y);
    context.draftCtx.stroke();
  }

  onPointerMove(point: Point, context: ToolContext, e: PointerEvent): void {
    const { draftCtx } = context;
    
    // Clear draft canvas for this stroke
    draftCtx.clearRect(0, 0, draftCtx.canvas.width, draftCtx.canvas.height);
    this.setupContext(draftCtx, context);

    if (e.shiftKey && this.startPoint) {
      // Draw straight line preview
      draftCtx.beginPath();
      draftCtx.moveTo(this.startPoint.x, this.startPoint.y);
      draftCtx.lineTo(point.x, point.y);
      draftCtx.stroke();
    } else {
      // Draw smooth curve preview
      this.points.push(point);
      this.drawPath(draftCtx, this.points);
    }
  }

  onPointerUp(point: Point, context: ToolContext, e: PointerEvent): void {
    const { mainCtx, draftCtx } = context;
    
    // Finalize stroke to main context
    this.setupContext(mainCtx, context);
    
    if (e.shiftKey && this.startPoint) {
      mainCtx.beginPath();
      mainCtx.moveTo(this.startPoint.x, this.startPoint.y);
      mainCtx.lineTo(point.x, point.y);
      mainCtx.stroke();
    } else {
      this.points.push(point);
      this.drawPath(mainCtx, this.points);
    }
    
    // Clear draft canvas completely
    draftCtx.clearRect(0, 0, draftCtx.canvas.width, draftCtx.canvas.height);
    
    this.points = [];
    this.startPoint = null;
  }
}
