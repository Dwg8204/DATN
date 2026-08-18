/**
 * Resize an image (File, Blob, or URL) to targetWidth × targetHeight
 * and return a Blob (default) or a data URL.
 *
 * @param {File | Blob | string} source  - original image
 * @param {number} targetWidth           - desired width (px)
 * @param {number} targetHeight          - desired height (px)
 * @param {'blob' | 'dataURL'} output    - output format
 * @param {string} mimeType             - 'image/webp' | 'image/jpeg' | 'image/png'
 * @param {number} quality              - 0 - 1 (only applies to JPEG/WebP)
 * @returns {Promise<Blob | string>}
 */
export async function resizeImage(
  source,
  targetWidth,
  targetHeight,
  { output = 'blob', mimeType = 'image/webp', quality = 0.9 } = {}
) {
  // 1. Create URL if source is File/Blob
  const url = source instanceof Blob ? URL.createObjectURL(source) : source;

  // 2. Load image into HTMLImageElement
  const img = await loadImage(url);

  // 3. Draw on Canvas with desired dimensions
  const canvas = document.createElement('canvas');
  // Calculate proportional size to fit within targetWidth x targetHeight
  const imgRatio = img.width / img.height;
  const targetRatio = targetWidth / targetHeight;
  
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  
  if (imgRatio > targetRatio) {
    // Image is proportionally wider than target box
    drawHeight = targetWidth / imgRatio;
  } else {
    // Image is proportionally taller than target box
    drawWidth = targetHeight * imgRatio;
  }
  
  canvas.width = drawWidth;
  canvas.height = drawHeight;
  
  canvas.getContext('2d').drawImage(img, 0, 0, drawWidth, drawHeight);

  // 4. Revoke objectURL if created
  if (source instanceof Blob) URL.revokeObjectURL(url);

  // 5. Output result
  if (output === 'dataURL') return canvas.toDataURL(mimeType, quality);
  return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Thêm dòng này để xử lý ảnh từ link bên ngoài (CORS) tránh lỗi Tainted Canvas
    img.crossOrigin = 'anonymous'; 
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
