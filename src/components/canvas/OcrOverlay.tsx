import { useEffect, useRef } from 'react';
import { useOcrStore } from '../../store/useOcrStore';
import { ViewportManager } from '../../core/canvas/ViewportManager';
import { DOCUMENT_PADDING } from '../../core/canvas/CanvasEngine';

interface OcrOverlayProps {
  viewportManager: ViewportManager | null;
}

export function OcrOverlay({ viewportManager }: OcrOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { isOcrModeActive, result, status } = useOcrStore();
  const dpr = window.devicePixelRatio || 1;

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

  if (!isOcrModeActive || !result || status !== 'done') {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className="absolute top-0 left-0 pointer-events-auto"
      style={{
        width: 0,
        height: 0,
        willChange: 'transform',
      }}
    >
      {result.lines.map((line, lineIdx) => {
        const logicalX = (line.x / dpr) + DOCUMENT_PADDING;
        const logicalY = (line.y / dpr) + DOCUMENT_PADDING;
        const logicalW = line.width / dpr;
        const logicalH = line.height / dpr;
        
        // Add subtle padding to make the text block look like Snipping Tool
        const padX = 4;
        const padY = 2;

        return (
          <div
            key={lineIdx}
            className="absolute rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-text"
            style={{
              left: `${logicalX - padX}px`,
              top: `${logicalY - padY}px`,
              width: `${logicalW + padX * 2}px`,
              height: `${logicalH + padY * 2}px`,
            }}
            title={line.text}
          >
            <div className="w-full h-full relative" style={{ transform: `translate(${padX}px, ${padY}px)` }}>
              {line.words.map((word, wordIdx) => {
                const relX = (word.x - line.x) / dpr;
                const relY = (word.y - line.y) / dpr;
                const wordH = word.height / dpr;
                
                // Calculate extended width to completely eliminate horizontal gaps between words
                const nextWord = line.words[wordIdx + 1];
                const nextRelX = nextWord ? (nextWord.x - line.x) / dpr : line.width / dpr;
                const extendedWidth = nextRelX - relX;
                
                return (
                  <span
                    key={wordIdx}
                    className="absolute whitespace-pre select-text pointer-events-auto selection:bg-blue-500/40 selection:text-transparent"
                    style={{
                      left: `${relX}px`,
                      top: `${relY}px`,
                      width: `${extendedWidth}px`, // Use extended width to cover gaps
                      height: `${wordH}px`,
                      color: 'transparent',
                      fontSize: `${Math.max(wordH * 0.8, 12)}px`,
                      lineHeight: `${wordH}px`,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
