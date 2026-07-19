import { OcrLineData } from '../../types';

interface Props {
  linesData: OcrLineData[];
}

export function OcrTextLayer({ linesData }: Props) {
  if (linesData.length === 0) return null;

  return (
    <>
      {linesData.map((line, lineIdx) => {
        const padX = 4;
        const padY = 2;

        return (
          <div
            key={lineIdx}
            className="absolute rounded mix-blend-difference bg-white/15 cursor-text pointer-events-none"
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
                      {bounds.char}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        );
      })}
    </>
  );
}
