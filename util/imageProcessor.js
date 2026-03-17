import { removeBackground } from "@imgly/background-removal";

/**
 * Process image: remove background and convert to WebP
 * @param {File} file - The image file to process
 * @param {Function} onProgress - Optional progress callback (key, current, total) => void
 * @returns {Promise<File>} - Processed image as WebP File
 */
export async function processImageRemoveBackground(file, onProgress = null) {
  try {
    // Configure background removal with progress callback
    const config = {
      format: "image/webp",
    };

    // Add progress callback if provided
    if (onProgress) {
      config.progress = (key, current, total) => {
        console.log(
          `[imageProcessor] Progress callback: key=${key}, current=${current}, total=${total}`
        );
        try {
          onProgress(key, current, total);
        } catch (error) {
          console.error("Error in progress callback:", error);
        }
      };
    }

    // Remove background using @imgly/background-removal with WebP format
    const blob = await removeBackground(file, config);

    // Convert blob to File with WebP format
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    const processedFile = new File([blob], fileName, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return processedFile;
  } catch (error) {
    console.error("Error processing image:", error);
    // If processing fails, return original file
    return file;
  }
}

/**
 * Process multiple images: remove background and convert to WebP
 * @param {File[]} files - Array of image files to process
 * @param {Function} onProgress - Optional progress callback (index, total) => void
 * @returns {Promise<File[]>} - Array of processed images as WebP Files
 */
export async function processImagesRemoveBackground(files, onProgress) {
  const processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) {
      onProgress(i + 1, files.length);
    }

    const processedFile = await processImageRemoveBackground(files[i]);
    processedFiles.push(processedFile);
  }

  return processedFiles;
}

/**
 * Make a non-square image square by adding white padding on the sides.
 * Applied to all images that are not square; no file size check.
 * @param {File} file - The image file to process
 * @returns {Promise<File>} - Square image file (same file if already square, else new file with white padding)
 */
export function makeImageSquare(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const width = img.width;
        const height = img.height;

        if (width === height) {
          resolve(file);
          return;
        }

        const size = Math.max(width, height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);

        const x = (size - width) / 2;
        const y = (size - height) / 2;
        ctx.drawImage(img, x, y, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const squareFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(squareFile);
          },
          "image/jpeg",
          0.92
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image if it's larger than the specified size threshold.
 * Non-square images are first made square (white padding) before size check.
 * @param {File} file - The image file to compress
 * @param {number} maxSizeBytes - Maximum file size in bytes before compression (default: 1MB)
 * @param {number} quality - JPEG quality (0-1, default: 0.8)
 * @returns {Promise<File>} - Compressed image file or original if already small or compression fails
 */
export async function compressImageIfNeeded(file, maxSizeBytes = 1024 * 1024, quality = 0.8) {
  let currentFile = await makeImageSquare(file);

  if (currentFile.size <= maxSizeBytes) {
    return currentFile;
  }

  try {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(currentFile);
                return;
              }

              const fileName = currentFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], fileName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              if (compressedFile.size >= currentFile.size) {
                resolve(currentFile);
              } else {
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            quality
          );
        };

        img.onerror = () => resolve(currentFile);
        img.src = e.target.result;
      };

      reader.onerror = () => resolve(currentFile);
      reader.readAsDataURL(currentFile);
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    return currentFile;
  }
}

/**
 * Compress multiple images if they exceed the size threshold
 * @param {File[]} files - Array of image files to compress
 * @param {number} maxSizeBytes - Maximum file size in bytes before compression (default: 1MB)
 * @param {number} quality - JPEG quality (0-1, default: 0.8)
 * @returns {Promise<File[]>} - Array of compressed image files
 */
export async function compressImagesIfNeeded(files, maxSizeBytes = 1024 * 1024, quality = 0.8) {
  const compressedFiles = [];

  for (const file of files) {
    const compressed = await compressImageIfNeeded(file, maxSizeBytes, quality);
    compressedFiles.push(compressed);
  }

  return compressedFiles;
}
