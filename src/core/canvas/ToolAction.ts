import { Point } from '../types';

export interface ToolContext {
  mainCtx: CanvasRenderingContext2D;
  draftCtx: CanvasRenderingContext2D;
  color: string;
  brushSize: number;
}

export interface ToolAction {
  onPointerDown(point: Point, context: ToolContext, e: PointerEvent): void;
  onPointerMove(point: Point, context: ToolContext, e: PointerEvent): void;
  onPointerUp(point: Point, context: ToolContext, e: PointerEvent): void;
}
