import React, { useEffect, useState } from "react";
import Head from "../../../util/head";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../../components/customInput/customInput";
import styles from "../../../styles/master.module.css";
import { Button, Switch, Flex, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import materialcategory from "../../../helper/materialcategory";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";

const validation = Yup.object({
  category_name: Yup.string().required("Category name is required"),
});

const EMPTY_CATEGORY = {
  category_name: "",
  is_active: true,
};

function CategoryForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const [initialValues, setInitialValues] = useState(EMPTY_CATEGORY);

  useEffect(() => {
    async function fetchCategory() {
      if (paramId) {
        try {
          const response = await materialcategory.getMaterialCategoryById(
            paramId
          );
          if (response) {
            let isActive = response.is_active;
            // Convert is_active to boolean if it's 1/0
            if (typeof isActive === "number") {
              isActive = isActive === 1;
            }
            setInitialValues({
              category_name: response.category_name || "",
              is_active: typeof isActive === "boolean" ? isActive : true,
            });
          }
        } catch (error) {
          console.error("Error fetching category:", error);
          toast.error("Error fetching category details");
        }
      }
    }
    if (editMode || viewMode) {
      fetchCategory();
    }
  }, [paramId, editMode, viewMode]);

  const handleSubmit = (values) => {
    const data = {
      ...values,
      is_active: values.is_active !== undefined ? values.is_active : true,
    };

    const promise = editMode
      ? materialcategory.updateMaterialCategory(paramId, {
          category_name: data.category_name,
          is_active: data.is_active,
        })
      : materialcategory.createMaterialCategory(data);

    toast.promise(promise, {
      loading: editMode ? "Updating category..." : "Adding new category...",
      success: (response) => {
        if (response.code === 200) {
          router.push("/materials/category");
          return editMode ? "Category Updated!" : "Category Added!";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.error(err);
        return editMode ? "Error updating category!" : "Error adding category!";
      },
    });
  };

  return (
    <GlobalWrapper>
      <Head />
      <CustomContainer
        title={
          viewMode
            ? "View Category"
            : editMode
            ? "Edit Category"
            : "Add New Category"
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
              <div className={styles.inputContainer}>
                <CustomContainer>
                  <div className={styles.inputSubContainer}>
                    <CustomInput
                      label="Category Name *"
                      name="category_name"
                      type="text"
                      editable={!viewMode}
                    />
                  </div>
                </CustomContainer>

                {!viewMode && (
                  <Flex
                    className={styles.buttonContainer}
                    mt={8}
                    justify="flex-end"
                  >
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>

                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {editMode ? "Update" : "Create"}
                    </Button>
                  </Flex>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CategoryForm;
