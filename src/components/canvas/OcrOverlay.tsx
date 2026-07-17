import { useEffect, useRef, useState, useMemo } from 'react';
import { useOcrStore } from '../../store/useOcrStore';
import { ViewportManager } from '../../core/canvas/ViewportManager';
import { DOCUMENT_PADDING } from '../../core/canvas/CanvasEngine';

interface OcrOverlayProps {
  viewportManager: ViewportManager | null;
}

interface CharBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

export function OcrOverlay({ viewportManager }: OcrOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { isOcrModeActive, result, status } = useOcrStore();
  const dpr = window.devicePixelRatio || 1;
  const [highlightRects, setHighlightRects] = useState<CharBounds[]>([]);

  useEffect(() => {
    if (overlayRef.current && viewportManager) {
      viewportManager.registerOverlay(overlayRef.current);
    }
    return () => {
      if (overlayRef.current && viewportManager) {
        viewportManager.unregisterOverlay(overlayRef.current);
      }
    };
  }, [viewportManager, isOcrModeActive, result, status]);

  // Pre-calculate DOM text strings and 1-to-1 character bounding boxes
  const linesData = useMemo(() => {
    if (!result || status !== 'done') return [];
    
    return [...result.lines]
      .sort((a, b) => {
        const yTolerance = Math.min(a.height, b.height) * 0.5;
        if (Math.abs(a.y - b.y) < yTolerance) return a.x - b.x;
        return a.y - b.y;
      })
      .map(line => {
        let text = "";
        const charBounds: CharBounds[] = [];
        const sortedWords = [...line.words].sort((a, b) => a.x - b.x);
        
        const lineY = (line.y / dpr) + DOCUMENT_PADDING;
        const lineH = line.height / dpr;

        sortedWords.forEach((word, idx) => {
          const prevWord = idx > 0 ? sortedWords[idx - 1] : null;
          if (prevWord) {
            const gap = word.x - (prevWord.x + prevWord.width);
            const avgCharWidth = (prevWord.width / prevWord.text.length + word.width / word.text.length) / 2;
            if (gap > avgCharWidth * 0.5) {
              text += " ";
              charBounds.push({
                x: (prevWord.x + prevWord.width) / dpr + DOCUMENT_PADDING,
                y: lineY - 2, // padY
                w: gap / dpr,
                h: lineH + 4, // padY * 2
                text: " "
              });
            }
          }
          
          const wordText = word.text;
          text += wordText;
          const charW = word.width / wordText.length;
          for (let i = 0; i < wordText.length; i++) {
            charBounds.push({
              x: (word.x + i * charW) / dpr + DOCUMENT_PADDING,
              y: lineY - 2,
              w: charW / dpr,
              h: lineH + 4,
              text: wordText[i]
            });
          }
        });
        
        return {
          logicalX: (line.x / dpr) + DOCUMENT_PADDING,
          logicalY: lineY,
          logicalW: line.width / dpr,
          logicalH: lineH,
          text,
          charBounds
        };
      });
  }, [result, status, dpr]);

  // Custom Selection Engine
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
  }, [linesData]);

  if (!isOcrModeActive || !result || status !== 'done') return null;

  return (
    <div 
      ref={overlayRef}
      className="absolute top-0 left-0 pointer-events-auto"
      style={{ width: 0, height: 0, willChange: 'transform' }}
    >
      {/* 1. Custom Highlight Layer (Pointer events NONE) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
        {highlightRects.map((rect, i) => (
          <div
            key={`hi-${i}`}
            className="absolute bg-blue-500/40 rounded-sm"
            style={{
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.w}px`,
              height: `${rect.h}px`,
            }}
          />
        ))}
      </div>

      {/* 2. Invisible DOM Text Layer (Pointer events AUTO) */}
      <div className="absolute top-0 left-0 w-full h-full z-20">
        {linesData.map((line, lineIdx) => {
          const padX = 4;
          const padY = 2;

          return (
            <div
              key={lineIdx}
              className="absolute rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-text"
              style={{
                left: `${line.logicalX - padX}px`,
                top: `${line.logicalY - padY}px`,
                width: `${line.logicalW + padX * 2}px`,
                height: `${line.logicalH + padY * 2}px`,
              }}
              title={line.text}
            >
              <div 
                className="w-full h-full relative"
                style={{ 
                  whiteSpace: 'nowrap',
                  // Ensure the first character starts at its true physical offset, restoring the padX alignment
                  paddingLeft: `${line.charBounds[0] ? (line.charBounds[0].x - line.logicalX + padX) : padX}px`
                }}
              >
                {(() => {
                  let currentX = line.charBounds[0] ? (line.charBounds[0].x - line.logicalX + padX) : padX;
                  return line.charBounds.map((bounds, charIdx) => {
                    const isLast = charIdx === line.charBounds.length - 1;
                    
                    const spanLeft = currentX;
                    const expectedRight = isLast ? (line.logicalW + padX * 2) : (line.charBounds[charIdx + 1].x - line.logicalX + padX);
                    const spanWidth = Math.max(0, expectedRight - spanLeft);
                    
                    currentX = spanLeft + spanWidth;

                    return (
                      <span
                        key={charIdx}
                        data-line-idx={lineIdx}
                        data-char-idx={charIdx}
                        className="ocr-char inline-block select-text pointer-events-auto selection:bg-transparent selection:text-transparent"
                        style={{
                          width: `${spanWidth}px`,
                          height: '100%',
                          color: 'transparent',
                          fontSize: `${Math.max(line.logicalH * 0.8, 12)}px`,
                          lineHeight: `${line.logicalH + padY * 2}px`,
                          overflow: 'hidden',
                          verticalAlign: 'top',
                        }}
                      >
                        {bounds.text}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
