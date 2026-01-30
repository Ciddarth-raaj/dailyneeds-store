import React, { useState, useRef } from "react";
import { Button } from "@chakra-ui/react";
import toast from "react-hot-toast";
import asset from "../../helper/asset";
import product from "../../helper/product";
import { useProductById } from "../../customHooks/useProductById";

/**
 * Component for uploading product images directly from AgGrid listing
 * Allows multiple image uploads and updates product immediately
 */
function ProductImageUploadCell({ value, data, api }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const productId = data?.product_id;

  // Fetch product data to get existing images
  const { product: productData, loading: loadingProduct, refetch } = useProductById(
    productId,
    { enabled: !!productId }
  );

  if (!productId) {
    return <span>-</span>;
  }

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} image(s)...`);

    try {
      // Get existing images from the fetched product data
      const existingImages = productData?.images || [];
      let formattedExistingImages = [];

      // Format existing images
      if (Array.isArray(existingImages)) {
        formattedExistingImages = existingImages.map((img, index) => {
          if (typeof img === "string") {
            return {
              image_url: img,
              priority: index,
            };
          } else if (img?.image_url) {
            return {
              image_url: img.image_url,
              priority: img.priority !== undefined ? img.priority : index,
            };
          }
          return null;
        }).filter(Boolean);
      }

      // Upload new images
      const uploadedImages = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        try {
          const uploadRes = await asset.upload(
            file,
            file.name,
            "products/image",
            undefined,
            `${productId}_${formattedExistingImages.length + index + 1}`
          );

          if (uploadRes.code === 200) {
            uploadedImages.push({
              image_url: uploadRes.remoteUrl,
              priority: formattedExistingImages.length + index,
            });
          }
        } catch (err) {
          console.error(`Error uploading image ${file.name}:`, err);
          toast.error(`Failed to upload ${file.name}`, { id: toastId });
        }
      }

      // Combine existing and new images
      const allImages = [...formattedExistingImages, ...uploadedImages];

      // Update product with all images
      const updateData = {
        product_id: productId,
        images: allImages,
      };

      const response = await product.updateProduct(updateData);

      if (response?.code === 200 || response?.code?.code === 200) {
        toast.success(
          `Successfully uploaded ${uploadedImages.length} image(s)`,
          { id: toastId }
        );

        // Refetch product data to get updated images
        await refetch();

        // Refresh the row data in AgGrid
        if (api && data) {
          const updatedData = {
            ...data,
            has_images: allImages.length > 0,
          };
          
          // Try to find the row node and update it
          const rowNode = api.getRowNode(productId);
          if (rowNode) {
            rowNode.setData(updatedData);
          } else {
            // Fallback to applyTransaction if getRowNode doesn't work
            api.applyTransaction({ update: [updatedData] });
          }
        }
      } else {
        throw new Error(response?.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error(
        error.message || "Failed to upload images",
        { id: toastId }
      );
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Button
        size="sm"
        colorScheme="purple"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        isLoading={uploading || loadingProduct}
        loadingText={uploading ? "Uploading..." : "Loading..."}
        disabled={uploading || loadingProduct}
      >
        Browse Files
      </Button>
    </>
  );
}

export default ProductImageUploadCell;
