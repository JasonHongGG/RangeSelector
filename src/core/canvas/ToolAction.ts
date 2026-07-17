import { Point } from '../types';

export interface ToolContext {
  ctx: CanvasRenderingContext2D;
  color: string;
  brushSize: number;
}

export interface ToolAction {
  start(point: Point, context: ToolContext): void;
  draw(points: Point[], context: ToolContext): void;
  end(context: ToolContext): void;
}
