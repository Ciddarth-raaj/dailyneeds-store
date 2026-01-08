import React, { useState, useEffect, useMemo } from "react";
import { Box, Grid, Image, Text, Button } from "@chakra-ui/react";

/**
 * Normalize images to proper format for display and drag-drop
 */
const normalizeImages = (images) => {
  if (!images || !Array.isArray(images)) return [];

  return images.map((img, idx) => {
    if (img instanceof File) {
      return {
        image_url: img, // File object
        priority: idx,
      };
    } else if (typeof img === "string") {
      return {
        image_url: img,
        priority: idx,
      };
    } else if (img && img.image_url) {
      return {
        image_url: img.image_url,
        priority: img.priority !== undefined ? img.priority : idx,
      };
    }
    return img;
  });
};

const ProductImageGallery = ({
  images = [],
  viewMode = false,
  onImagesChange,
}) => {
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState(null);

  // Normalize and sort by priority
  const normalizedImages = useMemo(() => normalizeImages(images), [images]);
  const sortedImages = useMemo(
    () =>
      [...normalizedImages].sort(
        (a, b) =>
          (a.priority !== undefined ? a.priority : 999) -
          (b.priority !== undefined ? b.priority : 999)
      ),
    [normalizedImages]
  );

  // Create object URLs for File objects and map them to images
  const imagesWithUrls = useMemo(() => {
    return sortedImages.map((img) => {
      let imageUrl;
      if (img instanceof File) {
        imageUrl = URL.createObjectURL(img);
      } else if (typeof img === "string") {
        imageUrl = img;
      } else if (img && img.image_url) {
        if (img.image_url instanceof File) {
          imageUrl = URL.createObjectURL(img.image_url);
        } else {
          imageUrl = img.image_url;
        }
      } else {
        imageUrl = img?.url || img || "";
      }
      return {
        ...img,
        displayUrl: imageUrl,
        isFileUrl: img instanceof File || img?.image_url instanceof File,
      };
    });
  }, [sortedImages]);

  // Cleanup object URLs on unmount or when images change
  useEffect(() => {
    const fileUrls = imagesWithUrls
      .filter((item) => item.isFileUrl)
      .map((item) => item.displayUrl);

    return () => {
      fileUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors
        }
      });
    };
  }, [imagesWithUrls]);

  if (!images || images.length === 0) {
    return <Text color="gray.500">No images</Text>;
  }

  const handleDragStart = (index) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverImageIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverImageIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }

    const newImages = [...sortedImages];
    const draggedImage = newImages[draggedImageIndex];
    newImages.splice(draggedImageIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update priorities based on new order
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      priority: idx,
    }));

    if (onImagesChange) {
      onImagesChange(reorderedImages);
    }

    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleDelete = (index) => {
    const updatedImages = sortedImages.filter((_, i) => i !== index);
    // Recalculate priorities after deletion
    const reorderedImages = updatedImages.map((img, idx) => ({
      ...img,
      priority: idx,
    }));

    if (onImagesChange) {
      onImagesChange(reorderedImages.length > 0 ? reorderedImages : []);
    }
  };

  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "repeat(3, 1fr)",
      }}
      gap={4}
    >
      {imagesWithUrls.map((imgData, index) => {
        const img = sortedImages[index];
        const imageUrl = imgData.displayUrl;

        const isDragging = draggedImageIndex === index;
        const isDragOver = dragOverImageIndex === index;

        // Create a stable key for React
        const imageKey =
          img?.image_url instanceof File
            ? `file-${img.image_url.name}-${img.image_url.size}-${img.image_url.lastModified}`
            : typeof img === "string"
            ? `url-${img}`
            : img?.image_url
            ? `url-${img.image_url}`
            : `img-${index}`;

        return (
          <Box
            key={imageKey}
            position="relative"
            border="1px solid"
            borderColor={
              isDragOver ? "purple.500" : isDragging ? "gray.400" : "gray.200"
            }
            borderRadius="md"
            overflow="hidden"
            cursor={!viewMode ? "move" : "default"}
            opacity={isDragging ? 0.5 : 1}
            transform={isDragging ? "scale(0.95)" : "scale(1)"}
            transition="all 0.2s"
            p={4}
            draggable={!viewMode}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <Image
              src={imageUrl}
              alt={`Product image ${index + 1}`}
              width="100%"
              height="200px"
              objectFit="contain"
              pointerEvents="none"
            />
            {!viewMode && (
              <>
                <Box
                  position="absolute"
                  top={2}
                  left={2}
                  bg="purple.500"
                  color="white"
                  px={2}
                  py={1}
                  borderRadius="sm"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  #{index + 1}
                </Box>
                <Button
                  position="absolute"
                  top={2}
                  right={2}
                  size="xs"
                  colorScheme="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(index);
                  }}
                >
                  <i className="fa fa-times" />
                </Button>
                <Box
                  position="absolute"
                  bottom={2}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="blackAlpha.700"
                  color="white"
                  px={2}
                  py={1}
                  borderRadius="sm"
                  fontSize="xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <i className="fa fa-arrows" /> Drag to reorder
                </Box>
              </>
            )}
          </Box>
        );
      })}
    </Grid>
  );
};

export default ProductImageGallery;
