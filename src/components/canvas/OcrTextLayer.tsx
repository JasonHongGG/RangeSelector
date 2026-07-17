import { OcrLineData } from '../../types';

interface Props {
  linesData: OcrLineData[];
}

export function OcrTextLayer({ linesData }: Props) {
  if (linesData.length === 0) return null;

  return (
    <>
      {linesData.map((line, lineIdx) => {
        // Find the min X in the logical bounds to align the container
        const minX = line.charBounds.length > 0 ? line.charBounds[0].x : line.logicalX;
        
        return (
          <div
            key={lineIdx}
            className="absolute whitespace-pre text-transparent ocr-line leading-none"
            style={{
              left: `${line.logicalX}px`,
              top: `${line.logicalY}px`,
              width: `${line.logicalW}px`,
              height: `${line.logicalH}px`,
              fontSize: `${line.fontSize}px`,
              paddingLeft: `${minX - line.logicalX}px`, 
            }}
          >
            {line.charBounds.map((bounds, charIdx) => {
              const charId = `char-${lineIdx}-${charIdx}`;
              return (
                <span
                  id={charId}
                  key={charIdx}
                  className="ocr-char inline-block"
                  style={{
                    width: `${bounds.w}px`,
                    height: `${bounds.h}px`,
                  }}
                >
                  {bounds.char}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
