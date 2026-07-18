import { useMemo } from 'react';
import { OcrLineData } from '../types';

export function useOcrDataTransformer(result: any, status: string): OcrLineData[] {
  return useMemo(() => {
    if (status !== 'done' || !result || !result.lines) return [];

    const dpr = window.devicePixelRatio || 1;
    // We must import DOCUMENT_PADDING or hardcode 150 since it's the physical padding applied to the image in the canvas.
    const DOCUMENT_PADDING = 150; 

    return result.lines.map((line: any) => {
      const charBounds: { char: string; x: number; y: number; w: number; h: number }[] = [];
      const charGapThreshold = 15;

      const logicalLineY = (line.y / dpr) + DOCUMENT_PADDING;
      const logicalLineH = line.height / dpr;

      line.words.forEach((word: any, wordIdx: number) => {
        const text = word.text;
        const charW = word.width / Math.max(1, text.length);

        // Gap insertion logic
        if (wordIdx > 0) {
          const prevWord = line.words[wordIdx - 1];
          const prevEnd = prevWord.x + prevWord.width;
          const gap = word.x - prevEnd;
          
          if (gap > charGapThreshold) {
            const numSpaces = Math.max(1, Math.round(gap / charW));
            for (let i = 0; i < numSpaces; i++) {
              const spaceX = prevEnd + (i * charW);
              charBounds.push({
                char: ' ',
                x: (spaceX / dpr) + DOCUMENT_PADDING,
                y: logicalLineY,
                w: charW / dpr,
                h: logicalLineH
              });
            }
          }
        }

        // Add character bounds
        for (let i = 0; i < text.length; i++) {
          charBounds.push({
            char: text[i],
            x: ((word.x + i * charW) / dpr) + DOCUMENT_PADDING,
            y: logicalLineY,
            w: charW / dpr,
            h: logicalLineH
          });
        }
      });

      return {
        text: charBounds.map(b => b.char).join(''),
        charBounds,
        logicalX: (line.x / dpr) + DOCUMENT_PADDING,
        logicalY: (line.y / dpr) + DOCUMENT_PADDING,
        logicalW: line.width / dpr,
        logicalH: line.height / dpr,
        fontSize: line.height / dpr,
      };
    });
  }, [result, status]);
}
