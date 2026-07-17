import { HighlightRect } from '../../hooks/useCustomSelectionEngine';

interface Props {
  rects: HighlightRect[];
}

export function OcrHighlightLayer({ rects }: Props) {
  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, idx) => (
        <div
          key={`hl-${idx}`}
          className="absolute bg-blue-500/40 pointer-events-none"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.w}px`,
            height: `${rect.h}px`,
          }}
        />
      ))}
    </>
  );
}
