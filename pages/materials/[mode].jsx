import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import { Button, Flex, Grid } from "@chakra-ui/react";
import toast from "react-hot-toast";
import material from "../../helper/material";
import materialcategory from "../../helper/materialcategory";
import { useRouter } from "next/router";

const validation = Yup.object({
  name: Yup.string().required("Material name is required"),
  description: Yup.string().nullable(),
  unit_id: Yup.string().nullable(),
  material_category_id: Yup.string().nullable(),
});

const UNITS = [
  { id: 1, value: "Kg" },
  { id: 2, value: "g" },
  { id: 3, value: "ml" },
  { id: 4, value: "L" },
  { id: 5, value: "Units" },
  { id: 6, value: "Pcs" },
  { id: 7, value: "Box" },
  { id: 8, value: "Bag" },
];

const EMPTY_MATERIAL = {
  name: "",
  description: "",
  unit_id: null,
  material_category_id: "",
  is_active: true,
};

function MaterialForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const [initialValues, setInitialValues] = useState(EMPTY_MATERIAL);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function fetchMaterial() {
      if (paramId) {
        try {
          const response = await material.getMaterials();
          if (response && Array.isArray(response)) {
            const found = response.find(
              (mat) => String(mat.material_id) === String(paramId)
            );
            if (found) {
              setInitialValues({
                name: found.name || "",
                description: found.description || null,
                unit_id: found.unit_id || null,
                material_category_id: found.material_category_id || null,
                is_active:
                  typeof found.is_active === "number"
                    ? found.is_active === 1
                    : !!found.is_active,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching material:", error);
          toast.error("Error fetching material details");
        }
      }
    }
    if (editMode || viewMode) {
      fetchMaterial();
    }
  }, [paramId, editMode, viewMode]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await materialcategory.getMaterialCategories(0, 1000);
        setCategories(response.data || response || []);
      } catch (err) {
        setCategories([]);
      }
    }
    fetchCategories();
  }, []);

  const handleSubmit = (values) => {
    const data = {
      ...values,
      is_active: values.is_active ? values.is_active : true,
      description: values.description ? values.description : null,
      unit_id: values.unit_id ? values.unit_id : null,
      material_category_id: values.material_category_id
        ? values.material_category_id
        : null,
    };

    const promise = editMode
      ? material.updateMaterial(paramId, data)
      : material.createMaterial(data);

    toast.promise(promise, {
      loading: editMode ? "Updating material..." : "Adding new material...",
      success: (response) => {
        if (response.code === 200) {
          router.push("/materials");
          return editMode ? "Material Updated!" : "Material Added!";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.error(err);
        return editMode ? "Error updating material!" : "Error adding material!";
      },
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer
        title={
          viewMode
            ? "View Material"
            : editMode
            ? "Edit Material"
            : "Add New Material"
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
                    templateColumns={{ base: "1fr", md: "1fr 1fr 1fr 1fr" }}
                  >
                    <CustomInput
                      label="Material Name *"
                      name="name"
                      type="text"
                      editable={!viewMode}
                    />
                    <CustomInput
                      label="Description"
                      name="description"
                      type="text"
                      editable={!viewMode}
                    />
                    <CustomInput
                      label="Unit"
                      name="unit_id"
                      method="switch"
                      values={UNITS}
                      editable={!viewMode}
                    />
                    <CustomInput
                      label="Category"
                      name="material_category_id"
                      method="switch"
                      values={categories.map((cat) => ({
                        id: cat.material_category_id,
                        value: cat.category_name,
                      }))}
                      editable={!viewMode}
                    />
                  </Grid>
                </CustomContainer>

                <Flex gap={3} mt={8} justify="flex-end">
                  {!viewMode && (
                    <>
                      <Button
                        variant="outline"
                        colorScheme="red"
                        onClick={() => resetForm()}
                      >
                        Reset
                      </Button>
                      <Button colorScheme="purple" type="submit">
                        {editMode ? "Update" : "Create"}
                      </Button>
                    </>
                  )}
                </Flex>
              </form>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialForm;
