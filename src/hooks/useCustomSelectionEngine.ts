import { useState, useEffect, RefObject } from 'react';
import { OcrLineData, CharBounds } from '../types';

export interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useCustomSelectionEngine(
  overlayRef: RefObject<HTMLDivElement | null>,
  linesData: OcrLineData[]
): HighlightRect[] {
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !overlayRef.current) {
        setHighlightRects([]);
        return;
      }
      const range = sel.getRangeAt(0);
      
      // If selection doesn't touch our overlay at all, ignore it.
      // This allows the user to start dragging from outside the overlay!
      if (!range.intersectsNode(overlayRef.current)) return;

      const selectedCharsMap = new Map<string, { lineIdx: number, charIdx: number }>();

      const addNode = (node: Element) => {
        const lineIdxStr = node.getAttribute('data-line-idx');
        const charIdxStr = node.getAttribute('data-char-idx');
        if (lineIdxStr && charIdxStr) {
          selectedCharsMap.set(`${lineIdxStr}-${charIdxStr}`, {
            lineIdx: parseInt(lineIdxStr, 10),
            charIdx: parseInt(charIdxStr, 10)
          });
        }
      };
      
      const charNodes = overlayRef.current.querySelectorAll('.ocr-char');
      charNodes.forEach((node) => {
        // If the native selection intersects the physical DOM node AT ALL, select it!
        // This makes the selection feel instantly responsive like Snipping Tool bounding boxes.
        if (range.intersectsNode(node)) {
          addNode(node);
        }
      });

      // Force include the exact nodes the user started clicking (anchor) and is currently hovering (focus)
      // This bypasses native browser quirks where it drops text nodes if you click the empty space inside an inline-block.
      if (sel.anchorNode) {
        const anchorEl = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as Element);
        if (anchorEl?.classList.contains('ocr-char')) addNode(anchorEl);
      }
      if (sel.focusNode) {
        const focusEl = sel.focusNode.nodeType === 3 ? sel.focusNode.parentElement : (sel.focusNode as Element);
        if (focusEl?.classList.contains('ocr-char')) addNode(focusEl);
      }

      const selectedChars = Array.from(selectedCharsMap.values());

      const lineMap = new Map<number, number[]>();
      selectedChars.forEach(({ lineIdx, charIdx }) => {
        if (!lineMap.has(lineIdx)) lineMap.set(lineIdx, []);
        lineMap.get(lineIdx)!.push(charIdx);
      });
      
      const rects: CharBounds[] = [];
      lineMap.forEach((charIndices, lineIdx) => {
        const lineData = linesData[lineIdx];
        if (!lineData) return;
        
        charIndices.sort((a, b) => a - b);
        
        let currentRect: CharBounds | null = null;
        for (const i of charIndices) {
          const bounds = lineData.charBounds[i];
          if (!bounds) continue;
          
          if (!currentRect) {
            currentRect = { ...bounds };
          } else {
            const gap = bounds.x - (currentRect.x + currentRect.w);
            if (gap > bounds.w * 2) {
              rects.push({ ...currentRect });
              currentRect = { ...bounds };
            } else {
              const newRight = Math.max(currentRect.x + currentRect.w, bounds.x + bounds.w);
              currentRect.w = newRight - currentRect.x;
              currentRect.y = Math.min(currentRect.y, bounds.y);
              currentRect.h = Math.max(currentRect.y + currentRect.h, bounds.y + bounds.h) - currentRect.y;
            }
          }
        }
        if (currentRect) rects.push(currentRect);
      });
      
      setHighlightRects(rects);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [linesData, overlayRef]);

  return highlightRects;
}
