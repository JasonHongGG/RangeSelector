import { useEffect, useRef } from 'react';
import { useOcrStore } from '../../store/useOcrStore';
import { ViewportManager } from '../../core/canvas/ViewportManager';
import { DOCUMENT_PADDING } from '../../core/canvas/CanvasEngine';
import { useOcrDataTransformer } from '../../hooks/useOcrDataTransformer';
import { useCustomSelectionEngine } from '../../hooks/useCustomSelectionEngine';
import { OcrHighlightLayer } from './OcrHighlightLayer';
import { OcrTextLayer } from './OcrTextLayer';

interface Props {
  viewportManager: ViewportManager | null;
}

export function OcrOverlay({ viewportManager }: Props) {
  const { result, status, isOcrModeActive } = useOcrStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to viewport state without causing React re-renders on every pan
  useEffect(() => {
    if (overlayRef.current && viewportManager) {
      const unsubscribe = viewportManager.subscribe((state) => {
        if (overlayRef.current && state) {
          overlayRef.current.style.transformOrigin = '0 0';
          overlayRef.current.style.transform = state.transformString;
        }
      });
      return unsubscribe;
    }
  }, [viewportManager, isOcrModeActive, result, status]);

  // 2. Transform Raw OCR Data into Logical Rendering Data (Domain & Data Layer)
  const linesData = useOcrDataTransformer(result, status);

  // 3. Custom Selection Engine (Event Listener Layer)
  const highlightRects = useCustomSelectionEngine(overlayRef, linesData);

  if (status !== 'done' || !result || !(result as any).words || !isOcrModeActive) {
    return null;
  }

  // 4. Presentation Layer
  return (
    <div
      ref={overlayRef}
      className="absolute top-0 left-0"
      style={{
        left: `${DOCUMENT_PADDING}px`,
        top: `${DOCUMENT_PADDING}px`,
      }}
    >
      <OcrHighlightLayer rects={highlightRects} />
      <OcrTextLayer linesData={linesData} />
    </div>
  );
}
