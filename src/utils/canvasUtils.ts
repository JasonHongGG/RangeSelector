export const getCroppedCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;
  
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasContent = false;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasContent = true;
      }
    }
  }
  
  if (!hasContent) return sourceCanvas;
  
  const dpr = window.devicePixelRatio || 1;
  const margin = Math.round(10 * dpr);
  
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);
  
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (cropCtx) {
    cropCtx.putImageData(ctx.getImageData(minX, minY, cropWidth, cropHeight), 0, 0);
  }
  return cropCanvas;
};
