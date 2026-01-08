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
