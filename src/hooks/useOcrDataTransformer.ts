import { useMemo } from 'react';
import { OcrLineData } from '../core/ocr/types';

export function useOcrDataTransformer(result: any, status: string): OcrLineData[] {
  return useMemo(() => {
    if (status !== 'done' || !result || !result.words) return [];

    const charGapThreshold = 15;
    let currentLine: any[] = [];
    let currentLineY = -1;
    const lines: any[][] = [];

    // Group words into lines based on Y-coordinate threshold
    const sortedWords = [...result.words].sort((a: any, b: any) => {
      const aY = (a.bbox.y0 + a.bbox.y1) / 2;
      const bY = (b.bbox.y0 + b.bbox.y1) / 2;
      if (Math.abs(aY - bY) > 10) {
        return aY - bY;
      }
      return a.bbox.x0 - b.bbox.x0;
    });

    sortedWords.forEach((word: any) => {
      const wordY = (word.bbox.y0 + word.bbox.y1) / 2;
      if (currentLineY === -1 || Math.abs(wordY - currentLineY) < 10) {
        currentLine.push(word);
        if (currentLineY === -1) currentLineY = wordY;
      } else {
        lines.push(currentLine);
        currentLine = [word];
        currentLineY = wordY;
      }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    // Transform raw lines into OcrLineData
    return lines.map(line => {
      let lineMinX = Infinity;
      let lineMinY = Infinity;
      let lineMaxX = -Infinity;
      let lineMaxY = -Infinity;

      const charBounds: { char: string; x: number; y: number; w: number; h: number }[] = [];

      line.forEach((word, wordIdx) => {
        const text = word.text;
        const charW = (word.bbox.x1 - word.bbox.x0) / text.length;

        // Gap insertion logic
        if (wordIdx > 0) {
          const prevWord = line[wordIdx - 1];
          const gap = word.bbox.x0 - prevWord.bbox.x1;
          if (gap > charGapThreshold) {
            const numSpaces = Math.max(1, Math.round(gap / charW));
            for (let i = 0; i < numSpaces; i++) {
              const spaceX = prevWord.bbox.x1 + (i * charW);
              charBounds.push({
                char: ' ',
                x: spaceX,
                y: word.bbox.y0,
                w: charW,
                h: word.bbox.y1 - word.bbox.y0
              });
            }
          }
        }

        // Add character bounds
        for (let i = 0; i < text.length; i++) {
          charBounds.push({
            char: text[i],
            x: word.bbox.x0 + (i * charW),
            y: word.bbox.y0,
            w: charW,
            h: word.bbox.y1 - word.bbox.y0
          });
        }

        lineMinX = Math.min(lineMinX, word.bbox.x0);
        lineMinY = Math.min(lineMinY, word.bbox.y0);
        lineMaxX = Math.max(lineMaxX, word.bbox.x1);
        lineMaxY = Math.max(lineMaxY, word.bbox.y1);
      });

      const logicalX = lineMinX;
      const logicalY = lineMinY;
      const logicalW = lineMaxX - lineMinX;
      const logicalH = lineMaxY - lineMinY;

      return {
        text: charBounds.map(b => b.char).join(''),
        charBounds,
        logicalX,
        logicalY,
        logicalW,
        logicalH,
        fontSize: logicalH,
      };
    });
  }, [result, status]);
}
