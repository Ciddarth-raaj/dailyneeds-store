import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import Head from "../../../util/head";
import CustomContainer from "../../../components/CustomContainer";
import { Formik, FieldArray, useFormikContext } from "formik";
import * as Yup from "yup";
import CustomInput from "../../../components/customInput/customInput";
import {
  Button,
  Flex,
  Grid,
  Select,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import material from "../../../helper/material";
import materialcategory from "../../../helper/materialcategory";
import { useRouter } from "next/router";
import EmptyData from "../../../components/EmptyData";
import OutletDropdown from "../../../components/MaterialsRequest/OutletDropdown";
import { useUser } from "../../../contexts/UserContext";

const validation = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        material_id: Yup.number().required(),
        quantity: Yup.mixed(), // optional
        remark: Yup.string(),
      })
    )
    .min(1, "At least one material is required"),
});

function MaterialRequestForm() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [outletId, setOutletId] = useState("");

  const { storeId } = useUser().userConfig;

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

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const response = await material.getMaterials();
        setAllMaterials(response || []);
      } catch (err) {
        setAllMaterials([]);
      }
    }
    fetchMaterials();
  }, []);

  const initialValues = {
    category_id: "",
    items: [],
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    const filteredItems = values.items
      .filter((item) => item.quantity && Number(item.quantity) > 0)
      .map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity),
        remark: item.remark,
      }));
    if (filteredItems.length === 0) {
      toast.error("Please enter quantity for at least one material.");
      setSubmitting(false);
      return;
    }
    const postData = { items: filteredItems };

    if (outletId) {
      postData.outlet_id = outletId;
    }

    try {
      const promise = material.createMaterialRequest(postData);
      toast.promise(promise, {
        loading: "Submitting request...",
        success: (response) => {
          if (response.material_request_id) {
            router.push("/materials/request");
            return "Material request submitted!";
          }

          throw new Error("Error submitting request!");
        },
        error: (err) => {
          return "Error submitting request!";
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper component to sync items with category
  function SyncItemsWithCategory({ allMaterials }) {
    const { values, setFieldValue } = useFormikContext();
    React.useEffect(() => {
      let filtered;
      if (!values.category_id) {
        filtered = allMaterials.filter(
          (mat) =>
            !mat.material_category_id || mat.material_category_id === null
        );
      } else {
        filtered = allMaterials.filter(
          (mat) =>
            String(mat.material_category_id) === String(values.category_id)
        );
      }
      setFieldValue(
        "items",
        filtered.map((mat) => ({
          material_id: mat.material_id,
          quantity: "",
          remark: "",
          name: mat.name,
        }))
      );
      // eslint-disable-next-line
    }, [values.category_id, allMaterials]);
    return null;
  }

  return (
    <GlobalWrapper>
      <Head />
      <CustomContainer title="Create Material Request" filledHeader>
        {!storeId && (
          <CustomContainer
            style={{ marginBottom: 32, backgroundColor: "#f7f7f7" }}
          >
            <OutletDropdown
              selectedOutlet={outletId}
              setSelectedOutlet={(val) => setOutletId(val)}
              disabled={false}
              showLabel
            />
          </CustomContainer>
        )}

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validation}
          onSubmit={handleSubmit}
        >
          {({
            handleSubmit,
            values,
            setFieldValue,
            isSubmitting,
            errors,
            touched,
          }) => (
            <form onSubmit={handleSubmit}>
              <SyncItemsWithCategory allMaterials={allMaterials} />

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <div>
                  <CustomInput
                    label="Category"
                    name="category_id"
                    method="switch"
                    values={(Array.isArray(categories) ? categories : []).map(
                      (cat) => ({
                        id: cat.material_category_id,
                        value: cat.category_name,
                      })
                    )}
                    value={values.category_id}
                    onChange={(e) =>
                      setFieldValue("category_id", e.target.value)
                    }
                    placeholder="No category (show uncategorized)"
                  />
                  {errors.category_id && touched.category_id && (
                    <div style={{ color: "red" }}>{errors.category_id}</div>
                  )}
                </div>
              </Grid>

              <CustomContainer style={{ marginTop: 32, padding: 0 }} noPadding>
                {values.items && values.items.length > 0 ? (
                  <FieldArray name="items">
                    {() => (
                      <div>
                        <Table
                          variant="striped"
                          mt="22px"
                          sx={{
                            "tbody tr:nth-of-type(odd) td": {
                              background: "#f7f7f7", // your custom stripe color
                            },
                          }}
                        >
                          <Thead>
                            <Tr>
                              <Th>Material Name</Th>
                              <Th>Quantity</Th>
                              <Th>Remark</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {values.items.map((item, idx) => (
                              <Tr key={item.material_id}>
                                <Td>
                                  <CustomInput
                                    name={`items[${idx}].name`}
                                    value={item.name}
                                    editable={false}
                                  />
                                </Td>
                                <Td>
                                  <CustomInput
                                    name={`items[${idx}].quantity`}
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    placeholder="Quantity"
                                  />
                                </Td>
                                <Td>
                                  <CustomInput
                                    name={`items[${idx}].remark`}
                                    value={item.remark}
                                    placeholder="Remark"
                                  />
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>

                        {errors.items && typeof errors.items === "string" && (
                          <div style={{ color: "red" }}>{errors.items}</div>
                        )}
                      </div>
                    )}
                  </FieldArray>
                ) : (
                  <EmptyData />
                )}
              </CustomContainer>
              <Flex gap={3} mt={8} justify="flex-end">
                <Button
                  colorScheme="purple"
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Submit Request
                </Button>
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialRequestForm;
