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
      {result.words.map((word, index) => {
        const logicalX = (word.x / dpr) + DOCUMENT_PADDING;
        const logicalY = (word.y / dpr) + DOCUMENT_PADDING;
        const logicalW = word.width / dpr;
        const logicalH = word.height / dpr;
        
        return (
          <span
            key={index}
            className="absolute whitespace-pre select-text selection:bg-blue-500/40 selection:text-transparent"
            style={{
              left: `${logicalX}px`,
              top: `${logicalY}px`,
              width: `${logicalW}px`,
              height: `${logicalH}px`,
              color: 'transparent',
              cursor: 'text',
              fontSize: `${Math.max(logicalH * 0.8, 12)}px`,
              lineHeight: `${logicalH}px`,
              display: 'flex',
              alignItems: 'center',
            }}
            title={word.text}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}
