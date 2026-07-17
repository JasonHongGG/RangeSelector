import { useState, useEffect, RefObject } from 'react';
import { OcrLineData } from '../types';

export interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useCustomSelectionEngine(
  containerRef: RefObject<HTMLDivElement | null>,
  linesData: OcrLineData[]
): HighlightRect[] {
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !containerRef.current) {
        setHighlightRects([]);
        return;
      }

      const range = sel.getRangeAt(0);
      
      const rects: HighlightRect[] = [];
      const anchorNode = sel.anchorNode;
      const focusNode = sel.focusNode;

      linesData.forEach((line, lineIdx) => {
        let isSelectingLine = false;
        let lineStartX = Infinity;
        let lineEndX = -Infinity;
        let lineTopY = Infinity;
        let lineBottomY = -Infinity;

        line.charBounds.forEach((bounds, charIdx) => {
          const charId = `char-${lineIdx}-${charIdx}`;
          const charEl = document.getElementById(charId);
          
          if (charEl) {
            const isIntersecting = range.intersectsNode(charEl);
            const isAnchor = anchorNode && charEl.contains(anchorNode);
            const isFocus = focusNode && charEl.contains(focusNode);

            if (isIntersecting || isAnchor || isFocus) {
              isSelectingLine = true;
              lineStartX = Math.min(lineStartX, bounds.x);
              lineEndX = Math.max(lineEndX, bounds.x + bounds.w);
              lineTopY = Math.min(lineTopY, bounds.y);
              lineBottomY = Math.max(lineBottomY, bounds.y + bounds.h);
            } else if (isSelectingLine) {
              rects.push({
                x: lineStartX,
                y: lineTopY,
                w: lineEndX - lineStartX,
                h: lineBottomY - lineTopY
              });
              isSelectingLine = false;
              lineStartX = Infinity;
              lineEndX = -Infinity;
              lineTopY = Infinity;
              lineBottomY = -Infinity;
            }
          }
        });

        if (isSelectingLine) {
          rects.push({
            x: lineStartX,
            y: lineTopY,
            w: lineEndX - lineStartX,
            h: lineBottomY - lineTopY
          });
        }
      });

      setHighlightRects(rects);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [linesData, containerRef]);

  return highlightRects;
}
