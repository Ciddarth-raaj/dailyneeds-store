import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useProductById } from "../../customHooks/useProductById";
import { useRouter } from "next/router";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import { Button, Flex, Grid, Box, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useBrands } from "../../customHooks/useBrands";
import { useCategories } from "../../customHooks/useCategories";
import { useSubcategories } from "../../customHooks/useSubcategories";
import { useProductDepartments } from "../../customHooks/useProductDepartments";
import asset from "../../helper/asset";
import product from "../../helper/product";
import { capitalize } from "../../util/string";
import ProductImageUpload from "../../components/ProductImageUpload";

const validation = Yup.object({
  brand_id: Yup.number().nullable(),
  category_id: Yup.number().nullable(),
  subcategory_id: Yup.number().nullable(),
  department_id: Yup.number().nullable(),
  gf_manufacturer: Yup.string().nullable(),
  de_distributor: Yup.string().nullable(),
  images: Yup.array().nullable(),
});

function ProductForm() {
  const router = useRouter();
  const { mode, id } = router.query;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const {
    product: productData,
    loading,
    updateProduct,
  } = useProductById(id, { enabled: !createMode && !!id });

  const [initialValues, setInitialValues] = useState({
    product_id: null,
    de_display_name: "",
    brand_id: null,
    category_id: null,
    subcategory_id: null,
    department_id: null,
    gf_manufacturer: "",
    de_distributor: "",
    images: [],
  });

  // Use custom hooks to fetch dropdown options
  const { brandsList, loading: loadingBrands } = useBrands();
  const { categoriesList, loading: loadingCategories } = useCategories();
  const { subcategoriesList, loading: loadingSubcategories } =
    useSubcategories();
  const { departmentsList, loading: loadingDepartments } =
    useProductDepartments();

  const loadingOptions =
    loadingBrands ||
    loadingCategories ||
    loadingSubcategories ||
    loadingDepartments;

  // Set initial values when product data is loaded
  useEffect(() => {
    if (productData && !createMode) {
      // Convert images array to format with image_url and priority
      const formattedImages =
        productData.images && Array.isArray(productData.images)
          ? productData.images
              .map((img, index) => {
                if (typeof img === "string") {
                  return {
                    image_url: img,
                    priority: index,
                  };
                } else if (img.image_url) {
                  return {
                    image_url: img.image_url,
                    priority: img.priority !== undefined ? img.priority : index,
                  };
                }
                return null;
              })
              .filter(Boolean)
              .sort((a, b) => a.priority - b.priority)
          : [];

      setInitialValues({
        product_id: productData.product_id || null,
        brand_id: productData.brand_id || null,
        de_display_name: productData.de_display_name || "",
        category_id: productData.category_id || null,
        subcategory_id: productData.subcategory_id || null,
        department_id: productData.department_id || null,
        gf_manufacturer: productData.gf_manufacturer || "",
        de_distributor: productData.de_distributor || "",
        images: formattedImages,
      });
    }
  }, [productData, createMode]);

  const handleSubmit = async (values) => {
    if (viewMode) return;

    const toastId = toast.loading(
      editMode ? "Updating product images..." : "Creating product..."
    );

    try {
      // Handle image uploads and format according to schema
      const formattedImages = [];
      if (values.images && values.images.length > 0) {
        for (let index = 0; index < values.images.length; index++) {
          const imageItem = values.images[index];

          // Check if imageItem is a File object directly
          if (imageItem instanceof File) {
            // Upload new file
            try {
              const uploadRes = await asset.upload(
                imageItem,
                imageItem.name,
                "products_t",
                undefined,
                `${id}_${index + 1}`
              );
              if (uploadRes.code === 200) {
                formattedImages.push({
                  image_url: uploadRes.remoteUrl,
                  priority: index,
                });
              }
            } catch (err) {
              console.error("Error uploading image:", err);
            }
          } else if (imageItem && imageItem.image_url) {
            // Check if image_url is a File object (new upload) or string (existing)
            if (imageItem.image_url instanceof File) {
              // Upload new file
              try {
                const uploadRes = await asset.upload(
                  imageItem.image_url,
                  imageItem.image_url.name,
                  "products_t",
                  undefined,
                  `${id}_${index + 1}`
                );
                if (uploadRes.code === 200) {
                  formattedImages.push({
                    image_url: uploadRes.remoteUrl,
                    priority: index,
                  });
                }
              } catch (err) {
                console.error("Error uploading image:", err);
              }
            } else {
              // Existing image object with URL string - update priority based on current index
              formattedImages.push({
                image_url: imageItem.image_url,
                priority: index,
              });
            }
          } else if (typeof imageItem === "string") {
            // Legacy format - convert to object
            formattedImages.push({
              image_url: imageItem,
              priority: index,
            });
          }
        }
      }

      const data = {
        product_id: id,
        images: formattedImages,
      };

      if (editMode) {
        const response = await updateProduct(data);
        if (response?.code === 200 || response?.code?.code === 200) {
          toast.success("Product images updated successfully!", {
            id: toastId,
          });
          router.push("/products");
        } else {
          throw new Error(
            response?.message || "Failed to update product images"
          );
        }
      } else {
        // Create mode - you may need to implement createProduct
        toast.error("Create mode not implemented", { id: toastId });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error.message ||
          (editMode ? "Failed to update product" : "Failed to create product"),
        { id: toastId }
      );
    }
  };

  if (loading || loadingOptions) {
    return (
      <GlobalWrapper title="Products">
        <CustomContainer title="Loading..." filledHeader>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Products">
      <CustomContainer
        title={
          viewMode
            ? "View Product"
            : editMode
            ? `Edit Product : ${capitalize(
                productData?.de_display_name ?? "-"
              )}`
            : "Create Product"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validation}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <form onSubmit={handleSubmit}>
                <CustomContainer>
                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    <CustomInput
                      label="Product ID"
                      name="product_id"
                      editable={false}
                    />

                    <CustomInput
                      label="Name"
                      name="de_display_name"
                      editable={false}
                    />

                    <CustomInput
                      label="Brand"
                      name="brand_id"
                      method="switch"
                      values={brandsList}
                      editable={false}
                    />

                    <CustomInput
                      label="Category"
                      name="category_id"
                      method="switch"
                      values={categoriesList}
                      editable={false}
                    />

                    <CustomInput
                      label="Subcategory"
                      name="subcategory_id"
                      method="switch"
                      values={subcategoriesList}
                      editable={false}
                    />

                    <CustomInput
                      label="Department"
                      name="department_id"
                      method="switch"
                      values={departmentsList}
                      editable={false}
                    />

                    <CustomInput
                      label="Manufacturer"
                      name="gf_manufacturer"
                      type="text"
                      editable={false}
                    />

                    <CustomInput
                      label="Supplier/Distributor"
                      name="de_distributor"
                      type="text"
                      editable={false}
                    />
                  </Grid>

                  {/* Images Section */}
                  <ProductImageUpload editMode={editMode} viewMode={viewMode} />
                </CustomContainer>

                {editMode && (
                  <Flex gap={3} mt={8} justify="flex-end">
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>
                    <Button colorScheme="purple" type="submit">
                      Update Images
                    </Button>
                  </Flex>
                )}
              </form>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductForm;
