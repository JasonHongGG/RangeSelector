export interface CharBounds {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrLineData {
  text: string;
  charBounds: CharBounds[];
  logicalX: number;
  logicalY: number;
  logicalW: number;
  logicalH: number;
  fontSize: number;
}
