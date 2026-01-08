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
import brands from "../../helper/brands";
import categories from "../../helper/categories";
import subcategories from "../../helper/subcategories";
import department from "../../helper/department";
import asset from "../../helper/asset";
import product from "../../helper/product";
import ProductImageGallery from "../../components/ProductImageGallery";

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
    brand_id: null,
    category_id: null,
    subcategory_id: null,
    department_id: null,
    gf_manufacturer: "",
    de_distributor: "",
    images: [],
  });

  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Fetch dropdown options
  useEffect(() => {
    async function fetchOptions() {
      try {
        setLoadingOptions(true);
        const [brandsRes, categoriesRes, subcategoriesRes, departmentsRes] =
          await Promise.all([
            brands.getBrands(0, 10000),
            categories.getCategories(0, 10000),
            subcategories.getSubCategories(0, 10000),
            department.getProductDepartment(),
          ]);

        setBrandsList(
          (brandsRes?.data || brandsRes || []).map((b) => ({
            id: b.brand_id,
            value: b.brand_name,
          }))
        );

        setCategoriesList(
          (categoriesRes?.data || categoriesRes || []).map((c) => ({
            id: c.category_id,
            value: c.category_name,
          }))
        );

        setSubcategoriesList(
          (subcategoriesRes?.data || subcategoriesRes || []).map((s) => ({
            id: s.subcategory_id,
            value: s.subcategory_name,
          }))
        );

        setDepartmentsList(
          (departmentsRes || []).map((d) => ({
            id: d.id || d.department_id,
            value: d.value || d.department_name,
          }))
        );
      } catch (error) {
        console.error("Error fetching options:", error);
        toast.error("Error loading form options");
      } finally {
        setLoadingOptions(false);
      }
    }

    fetchOptions();
  }, []);

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
        brand_id: productData.brand_id || null,
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
            ? "Edit Product Images"
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
            const { handleSubmit, resetForm, values, setFieldValue } =
              formikProps;

            return (
              <form onSubmit={handleSubmit}>
                <CustomContainer>
                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
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
                  <Box mt={6}>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Product Images
                    </Text>

                    {editMode && (
                      <Box mb={4}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: "none" }}
                          id="image-upload-input"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              const currentImages = values.images || [];
                              const newImageObjects = files.map(
                                (file, idx) => ({
                                  image_url: file, // File object
                                  priority: currentImages.length + idx,
                                })
                              );

                              setFieldValue("images", [
                                ...currentImages,
                                ...newImageObjects,
                              ]);
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
                          <i
                            className="fa fa-upload"
                            style={{ marginRight: "8px" }}
                          />
                          Upload Images
                        </Button>
                      </Box>
                    )}

                    <ProductImageGallery
                      images={values.images || []}
                      viewMode={!editMode}
                      onImagesChange={(newImages) => {
                        if (editMode) {
                          setFieldValue("images", newImages);
                        }
                      }}
                    />
                  </Box>
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
