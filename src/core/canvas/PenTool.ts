import { ToolAction, ToolContext } from './ToolAction';
import { Point } from '../types';

export class PenTool implements ToolAction {
  start(point: Point, context: ToolContext): void {
    const { ctx, color, brushSize } = context;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.strokeStyle = color;
    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = brushSize * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  draw(points: Point[], context: ToolContext): void {
    const { ctx } = context;
    if (points.length < 3) {
      const p0 = points[0];
      const p1 = points[1];
      if (p0 && p1) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];
    ctx.quadraticCurveTo(
      secondLastPoint.x, 
      secondLastPoint.y, 
      lastPoint.x, 
      lastPoint.y
    );
    
    ctx.stroke();
  }

  end(context: ToolContext): void {
    context.ctx.closePath();
  }
}
