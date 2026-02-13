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
 * Compress image if it's larger than the specified size threshold
 * @param {File} file - The image file to compress
 * @param {number} maxSizeBytes - Maximum file size in bytes before compression (default: 1MB)
 * @param {number} quality - JPEG quality (0-1, default: 0.8)
 * @returns {Promise<File>} - Compressed image file or original if already small or compression fails
 */
export async function compressImageIfNeeded(file, maxSizeBytes = 1024 * 1024, quality = 0.8) {
  // If file is already smaller than threshold, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  try {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Calculate new dimensions if needed (maintain aspect ratio, max width 1920px)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // If blob creation fails, return original file
                resolve(file);
                return;
              }

              // Create new File from blob
              const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], fileName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              // If compressed file is still larger than original, return original
              if (compressedFile.size >= file.size) {
                resolve(file);
              } else {
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            quality
          );
        };

        img.onerror = () => {
          // If image load fails, return original file
          resolve(file);
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        // If file read fails, return original file
        resolve(file);
      };

      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    // If compression fails, return original file
    return file;
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
