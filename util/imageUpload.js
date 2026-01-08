import { processImageRemoveBackground } from "./imageProcessor";

/**
 * Validates and normalizes the images array
 * @param {any} images - The images value from form
 * @returns {Array} - Normalized array of images
 */
export function validateImagesArray(images) {
  // Safety check: if images is a function, reset to empty array
  if (typeof images === "function") {
    console.error(
      "ERROR: images is a function! Resetting to empty array."
    );
    return [];
  }

  // Ensure it's an array
  if (!Array.isArray(images)) {
    console.error(
      "ERROR: images is not an array! Resetting to empty array.",
      typeof images
    );
    return [];
  }

  return images;
}

/**
 * Creates image objects with processing flags
 * @param {File[]} files - Array of file objects
 * @param {number} startPriority - Starting priority index
 * @returns {Array} - Array of image objects with processing flags
 */
export function createImageObjects(files, startPriority = 0) {
  return files.map((file, idx) => ({
    image_url: file, // Original File object
    priority: startPriority + idx,
    processing: false, // Don't mark as processing on upload
    processingId: `${Date.now()}-${idx}-${file.name}`, // Unique ID for tracking
  }));
}

/**
 * Updates a specific image in the array
 * @param {Array} imagesArray - Current images array
 * @param {string|number} identifier - Processing ID or index of the image to update
 * @param {File} processedFile - Processed file to replace with
 * @param {boolean} hasError - Whether processing failed
 * @param {boolean} useIndex - Whether identifier is an index instead of processingId
 * @returns {Array} - Updated images array
 */
export function updateImageInArray(
  imagesArray,
  identifier,
  processedFile,
  hasError = false,
  useIndex = false
) {
  const imageIndex = useIndex
    ? identifier
    : imagesArray.findIndex((img) => img.processingId === identifier);

  if (imageIndex === -1 || imageIndex >= imagesArray.length) {
    return imagesArray;
  }

  return imagesArray.map((img, idx) => {
    if (idx === imageIndex) {
      if (hasError) {
        return {
          ...img,
          processing: false,
          processingError: true,
        };
      } else {
        // Update this specific image - create new object to trigger re-render
        const { processingId: _, processing: __, ...restOfImage } = img;
        return {
          ...restOfImage,
          image_url: processedFile, // New File object - will trigger new object URL
          processing: false,
          _processedAt: Date.now(), // Add timestamp to force re-render
        };
      }
    }
    // Return all other images unchanged
    return img;
  });
}

/**
 * Marks an image as processing
 * @param {Array} imagesArray - Current images array
 * @param {number} index - Index of the image to mark as processing
 * @returns {Array} - Updated images array
 */
export function markImageAsProcessing(imagesArray, index) {
  if (index < 0 || index >= imagesArray.length) {
    return imagesArray;
  }

  return imagesArray.map((img, idx) => {
    if (idx === index) {
      return {
        ...img,
        processing: true,
        processingError: false,
      };
    }
    return img;
  });
}

/**
 * Process a single image file
 * @param {File} file - The image file to process
 * @param {boolean} enableBackgroundRemoval - Whether to process with background removal
 * @returns {Promise<File>} - Processed file or original file
 */
export async function processImageFile(file, enableBackgroundRemoval) {
  if (enableBackgroundRemoval) {
    return await processImageRemoveBackground(file);
  }
  return file;
}

