import React from "react";
import { useFormikContext } from "formik";
import { Box, Flex, Button } from "@chakra-ui/react";
import { useImageUpload } from "../../customHooks/useImageUpload";
import ProductImageGallery from "../ProductImageGallery";

/**
 * Component for handling product image upload with background removal
 * Uses Formik context to access form values
 */
function ProductImageUpload({ editMode, viewMode }) {
  const { values, setFieldValue } = useFormikContext();

  // Use custom hook for image upload and processing
  const { processingImages, handleImageUpload, processSingleImage } =
    useImageUpload(
      () => values.images || [], // Getter function
      (newImages) => setFieldValue("images", newImages) // Setter function
    );

  return (
    <Box mt={6}>
      <Box fontSize="sm" fontWeight="medium" mb={2}>
        Product Images
      </Box>
      {!viewMode && (
        <Box mb={4}>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            id="image-upload-input"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleImageUpload(files);
              }
              // Reset input
              e.target.value = "";
            }}
          />
          <Button
            as="label"
            htmlFor="image-upload-input"
            colorScheme="purple"
            variant="outline"
            cursor="pointer"
            size="sm"
          >
            <i className="fa fa-upload" style={{ marginRight: "8px" }} />
            Upload Images
          </Button>
        </Box>
      )}

      <ProductImageGallery
        images={values.images || []}
        viewMode={viewMode}
        onImagesChange={(newImages) => {
          if (editMode) {
            setFieldValue("images", newImages);
          }
        }}
        processingImages={processingImages}
        onRemoveBackground={processSingleImage}
      />
    </Box>
  );
}

export default ProductImageUpload;

