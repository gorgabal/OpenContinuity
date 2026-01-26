// Photo compression utility using browser-image-compression
import imageCompression from 'browser-image-compression';

/**
 * Compress an image file to be under 500KB using lossy compression.
 * Converts to JPEG for best compression ratio.
 *
 * @param {File} file - The original image file
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressPhoto(file) {
  const options = {
    maxSizeMB: 0.5, // Target max size: 500KB
    maxWidthOrHeight: 1920, // Reasonable max dimension for photos
    useWebWorker: true, // Non-blocking compression
    fileType: 'image/jpeg', // Best compression for photos
    initialQuality: 0.8, // Start with 80% quality
  };

  try {
    console.log(
      '[Photo Compression] Original file:',
      file.name,
      `${(file.size / 1024).toFixed(1)}KB`,
    );

    const compressedFile = await imageCompression(file, options);

    console.log(
      '[Photo Compression] Compressed file:',
      compressedFile.name,
      `${(compressedFile.size / 1024).toFixed(1)}KB`,
      `(${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction)`,
    );

    // Ensure the filename has .jpg extension since we convert to JPEG
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const compressedWithName = new File(
      [compressedFile],
      `${originalName}.jpg`,
      { type: 'image/jpeg' },
    );

    return compressedWithName;
  } catch (err) {
    console.error('[Photo Compression] Failed to compress:', err);
    throw err;
  }
}

/**
 * Convert a base64 data URL to a File object.
 *
 * @param {string} base64DataUrl - The base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @param {string} filename - The filename to use for the File
 * @returns {File} - The File object
 */
 //TODO: check if there is a library that does the base64 conversion. This seems error prone.
export function base64ToFile(base64DataUrl, filename) {
  const arr = base64DataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Convert a File/Blob to a base64 data URL.
 *
 * @param {File|Blob} file - The file to convert
 * @returns {Promise<string>} - The base64 data URL
 */
 //TODO: see comment above
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
