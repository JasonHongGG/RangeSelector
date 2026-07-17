export class HistoryManager {
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private onChangeCallback: ((canUndo: boolean, canRedo: boolean) => void) | null = null;

  constructor(onChange?: (canUndo: boolean, canRedo: boolean) => void) {
    if (onChange) {
      this.onChangeCallback = onChange;
    }
  }

  push(imageData: ImageData) {
    this.undoStack.push(imageData);
    this.redoStack = []; // Clear redo stack on new action
    this.notify();
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(ctx: CanvasRenderingContext2D): void {
    if (!this.canUndo()) return;
    
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    
    const previous = this.undoStack[this.undoStack.length - 1];
    ctx.putImageData(previous, 0, 0);
    this.notify();
  }

  redo(ctx: CanvasRenderingContext2D): void {
    if (!this.canRedo()) return;
    
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    ctx.putImageData(next, 0, 0);
    this.notify();
  }

  clear(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.undoStack.length === 0) return;
    const baseImage = this.undoStack[0];
    ctx.putImageData(baseImage, 0, 0);
    const newData = ctx.getImageData(0, 0, width, height);
    
    this.undoStack.push(newData);
    this.redoStack = [];
    this.notify();
  }

  reset(baseImageData: ImageData) {
    this.undoStack = [baseImageData];
    this.redoStack = [];
    this.notify();
  }

  setOnChange(callback: (canUndo: boolean, canRedo: boolean) => void) {
    this.onChangeCallback = callback;
    this.notify();
  }

  private notify() {
    if (this.onChangeCallback) {
      this.onChangeCallback(this.canUndo(), this.canRedo());
    }
  }
}
