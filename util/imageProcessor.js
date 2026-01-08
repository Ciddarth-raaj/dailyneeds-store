/**
 * Server-side safe wrapper - dynamically imports client-side processor
 * This ensures @imgly/background-removal only loads on the client side
 * @param {File} file - The image file to process
 * @param {Function} onProgress - Optional progress callback (key, current, total) => void
 * @returns {Promise<File>} - Processed image as WebP File
 */
export async function processImageRemoveBackground(file, onProgress = null) {
  // Only process on client side
  if (typeof window === "undefined") {
    return file;
  }

  try {
    // Dynamically import client-side processor (SSR disabled)
    const { processImageRemoveBackground: clientProcessor } = await import(
      "./imageProcessorClient"
    );
    return await clientProcessor(file, onProgress);
  } catch (error) {
    console.error("Error loading image processor:", error);
    // If loading fails, return original file
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
