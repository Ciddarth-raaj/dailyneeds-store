import { useState } from "react";
import toast from "react-hot-toast";
import {
  validateImagesArray,
  createImageObjects,
  updateImageInArray,
  processImageFile,
  markImageAsProcessing,
} from "../util/imageUpload";

/**
 * Custom hook for handling image upload and processing
 * @param {Function} getImages - Function that returns current images array
 * @param {Function} setImages - Function to update images array
 * @returns {Object} - Hook state and handlers
 */
export function useImageUpload(getImages, setImages) {
  const [processingImages, setProcessingImages] = useState(new Set());

  /**
   * Handle file upload (without processing)
   * @param {FileList} fileList - FileList from input element
   */
  const handleImageUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    // Get current images using the getter function
    const currentImages = getImages();

    // Validate and get current images
    let validatedImages = validateImagesArray(currentImages);

    // If validation failed, reset to empty array
    if (
      validatedImages.length === 0 &&
      currentImages &&
      currentImages.length > 0
    ) {
      setImages([]);
      validatedImages = [];
    }

    // Create new image objects (without processing)
    const newImageObjects = createImageObjects(files, validatedImages.length);

    const updatedImages = [...validatedImages, ...newImageObjects];
    setImages(updatedImages);
    toast.success(`Uploaded ${files.length} image(s)`);
  };

  /**
   * Process a single image by index (from sorted display array)
   * @param {number} displayIndex - Index of the image in the sorted/displayed array
   */
  const processSingleImage = async (displayIndex) => {
    const currentImages = getImages();
    const validatedImages = validateImagesArray(currentImages);

    // Sort images by priority to match the display order
    const sortedImages = [...validatedImages].sort(
      (a, b) =>
        (a.priority !== undefined ? a.priority : 999) -
        (b.priority !== undefined ? b.priority : 999)
    );

    if (displayIndex < 0 || displayIndex >= sortedImages.length) {
      console.error("Invalid image index:", displayIndex);
      return;
    }

    const image = sortedImages[displayIndex];

    // Find the actual index in the original array
    const actualIndex = validatedImages.findIndex(
      (img) =>
        (img.processingId && img.processingId === image.processingId) ||
        (img.image_url === image.image_url && img.priority === image.priority)
    );

    if (actualIndex === -1) {
      console.error("Could not find image in original array");
      return;
    }

    // Check if image is already processing
    if (processingImages.has(displayIndex)) {
      return;
    }

    // Get the file from the image
    let fileToProcess = null;
    if (image.image_url instanceof File) {
      fileToProcess = image.image_url;
    } else if (typeof image.image_url === "string") {
      // If it's a URL, we need to fetch it first
      try {
        const response = await fetch(image.image_url);
        const blob = await response.blob();
        const fileName = image.image_url.split("/").pop() || "image.webp";
        fileToProcess = new File([blob], fileName, { type: blob.type });
      } catch (error) {
        console.error("Error fetching image:", error);
        toast.error("Failed to fetch image for processing");
        return;
      }
    } else {
      toast.error("Invalid image format");
      return;
    }

    // Mark as processing (use displayIndex for tracking)
    setProcessingImages((prev) => new Set(prev).add(displayIndex));
    const updatedImagesWithProcessing = markImageAsProcessing(
      validatedImages,
      actualIndex
    );
    setImages(updatedImagesWithProcessing);

    try {
      // Process the image with background removal
      const processedFile = await processImageFile(fileToProcess, true);

      // Get updated images array (in case it changed)
      const currentImagesAfterProcessing = getImages();
      const updatedValidatedImages = validateImagesArray(
        currentImagesAfterProcessing
      );

      // Find the image again in case the array changed
      const updatedActualIndex = updatedValidatedImages.findIndex(
        (img) =>
          (img.processingId && img.processingId === image.processingId) ||
          (img.image_url === image.image_url && img.priority === image.priority)
      );

      if (updatedActualIndex === -1) {
        console.error("Image not found after processing start");
        return;
      }

      // Update the image in the array
      const updatedImagesArray = updateImageInArray(
        updatedValidatedImages,
        updatedActualIndex,
        processedFile,
        false,
        true // use index
      );

      // Set the actual array value
      setImages(updatedImagesArray);
      toast.success("Background removed successfully");
    } catch (error) {
      console.error("Error processing image:", error);

      // Get updated images array
      const currentImagesAfterError = getImages();
      const updatedValidatedImages = validateImagesArray(
        currentImagesAfterError
      );

      // Find the image again
      const updatedActualIndex = updatedValidatedImages.findIndex(
        (img) =>
          (img.processingId && img.processingId === image.processingId) ||
          (img.image_url === image.image_url && img.priority === image.priority)
      );

      if (updatedActualIndex === -1) {
        console.error("Image not found after error");
        return;
      }

      // Mark as failed but keep the original
      const updatedImagesArray = updateImageInArray(
        updatedValidatedImages,
        updatedActualIndex,
        fileToProcess, // Keep original file
        true, // Mark as error
        true // use index
      );

      setImages(updatedImagesArray);
      toast.error("Failed to remove background");
    } finally {
      // Remove from processing set
      setProcessingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(displayIndex);
        return newSet;
      });
    }
  };

  return {
    processingImages,
    handleImageUpload,
    processSingleImage,
  };
}
