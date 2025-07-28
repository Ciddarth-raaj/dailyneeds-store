import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import CustomContainer from "../../components/CustomContainer";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomInput from "../../components/customInput/customInput";
import { FieldArray, Formik } from "formik";
import {
  Button,
  Flex,
  Grid,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  InputGroup,
  InputRightAddon,
} from "@chakra-ui/react";
import material from "../../helper/material";
import styles from "../../styles/purchaseOrderTable.module.css";
import usePeople from "../../customHooks/usePeople";
import { useUser } from "../../contexts/UserContext";
import ReactSelect from "react-select";
import toast from "react-hot-toast";
import Link from "next/link";

const EMPTY_ITEM = {
  material_id: null,
  quantity: null,
  rate: null,
};

// Manual validation function that returns the first error found
const validateForm = (values) => {
  // Validate vendor_id
  if (!values.vendor_id) {
    return "Vendor is required";
  }

  // Validate purchase_order_id
  if (!values.purchase_order_id) {
    return "Purchase Order # is required";
  } else if (values.purchase_order_id.length < 3) {
    return "Purchase Order # must be at least 3 characters";
  } else if (values.purchase_order_id.length > 50) {
    return "Purchase Order # cannot exceed 50 characters";
  }

  // Validate purchase_reference_id (optional)
  if (values.purchase_reference_id) {
    if (values.purchase_reference_id.length < 3) {
      return "Purchase Reference # must be at least 3 characters";
    } else if (values.purchase_reference_id.length > 50) {
      return "Purchase Reference # cannot exceed 50 characters";
    }
  }

  // Validate date (optional)
  if (values.date) {
    const orderDate = new Date(values.date);
    const today = new Date();
    if (orderDate > today) {
      return "Date cannot be in the future";
    }
  }

  // Validate delivery_date (optional)
  if (values.delivery_date) {
    const deliveryDate = new Date(values.delivery_date);
    if (values.date) {
      const orderDate = new Date(values.date);
      if (deliveryDate < orderDate) {
        return "Delivery date must be on or after the order date";
      }
    }
  }

  // Validate items
  if (!values.items || values.items.length === 0) {
    return "At least one item is required";
  } else {
    for (let i = 0; i < values.items.length; i++) {
      const item = values.items[i];

      if (!item.material_id) {
        return `Item ${i + 1}: Item is required`;
      }

      if (!item.quantity) {
        return `Item ${i + 1}: Quantity is required`;
      } else if (isNaN(item.quantity) || parseFloat(item.quantity) <= 0) {
        return `Item ${i + 1}: Quantity must be greater than 0`;
      }

      if (!item.rate) {
        return `Item ${i + 1}: Rate is required`;
      } else if (isNaN(item.rate) || parseFloat(item.rate) <= 0) {
        return `Item ${i + 1}: Rate must be greater than 0`;
      }
    }
  }

  // Validate discount
  if (
    values.discount !== null &&
    values.discount !== undefined &&
    values.discount !== ""
  ) {
    if (isNaN(values.discount)) {
      return "Discount must be a number";
    } else if (parseFloat(values.discount) < 0) {
      return "Discount cannot be negative";
    } else if (parseFloat(values.discount) > 100) {
      return "Discount cannot exceed 100%";
    }
  }

  // Validate adjustment
  if (
    values.adjustment !== null &&
    values.adjustment !== undefined &&
    values.adjustment !== ""
  ) {
    if (isNaN(values.adjustment)) {
      return "Adjustment must be a number";
    }
  }

  return null; // No errors found
};

function PurchaseOrder() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;

  const { peopleList } = usePeople();
  const { storeId } = useUser().userConfig;

  const filtersPeopleList = useMemo(
    () =>
      peopleList
        .filter(
          (item) =>
            item.person_type === 3 &&
            (!storeId || !item.store_ids || item.store_ids?.includes(storeId))
        )
        .map((item) => ({
          id: item.person_id,
          value: item.name,
        })),
    [peopleList, storeId]
  );

  const viewMode = mode === "view";
  const editMode = mode === "edit";

  // Fetch materials for dropdown
  const [materialOptions, setMaterialOptions] = useState([]);
  useEffect(() => {
    async function fetchMaterials() {
      try {
        const data = await material.getMaterials();
        setMaterialOptions(
          (data || []).map((mat) => ({
            value: mat.material_id,
            label: `${mat.material_id} - ${mat.name}`,
            ...mat,
          }))
        );
      } catch (err) {
        setMaterialOptions([]);
      }
    }
    fetchMaterials();
  }, []);

  const handleSubmit = (values) => {
    const error = validateForm(values);
    if (!error) {
      toast.success("Purchase order saved successfully!");
      // Handle form submission here
    } else {
      toast.error(error);
    }
  };

  return (
    <GlobalWrapper>
      <CustomContainer title="Purchase Order" filledHeader>
        <Formik
          enableReinitialize
          initialValues={{
            date: null,
            delivery_date: null,
            items: [EMPTY_ITEM],
            discount: 0,
            adjustment: 0,
          }}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit, values, setFieldValue }) => {
            // Calculation helpers
            const getSubTotal = () => {
              return (values.items || []).reduce(
                (sum, item) =>
                  sum +
                  parseFloat(item.quantity || 0) * parseFloat(item.rate || 0),
                0
              );
            };

            const getDiscountAmount = () => {
              const subTotal = getSubTotal();
              const discountPercent = parseFloat(values.discount || 0);
              return subTotal * (discountPercent / 100);
            };

            const getAdjustment = () => {
              return parseFloat(values.adjustment || 0);
            };

            const getTotal = () => {
              const subTotal = getSubTotal();
              const discount = getDiscountAmount();
              const adjustment = getAdjustment();
              return subTotal - discount + adjustment;
            };

            return (
              <div>
                <div>
                  <CustomInput
                    label="Vendor Name"
                    name="vendor_id"
                    method="switch"
                    values={filtersPeopleList}
                    placeholder="Select Vendor"
                    editable={mode !== "view"}
                  />
                </div>

                <hr />

                <div style={{ marginTop: "32px" }}>
                  <Grid templateColumns="repeat(2, 1fr)">
                    <CustomInput
                      label="Purchase Order #"
                      name="purchase_order_id"
                      placeholder="12B6G"
                      editable={mode !== "view"}
                    />
                    <CustomInput
                      label="Purchase Reference #"
                      name="purchase_reference_id"
                      placeholder="12B6G"
                      editable={mode !== "view"}
                    />
                  </Grid>
                  <Grid templateColumns="repeat(2, 1fr)">
                    <CustomInput
                      label="Date"
                      name="date"
                      placeholder="DD/MM/YYYY"
                      editable={mode !== "view"}
                      method="datepicker"
                    />
                    <CustomInput
                      label="Delivery Date"
                      name="delivery_date"
                      placeholder="DD/MM/YYYY"
                      editable={mode !== "view"}
                      method="datepicker"
                    />
                  </Grid>

                  <div>
                    <FieldArray
                      name="items"
                      render={(arrayHelpers) => (
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
                                <Th>Item</Th>
                                <Th>Quantity</Th>
                                <Th>Rate</Th>
                                <Th>Amount</Th>
                                <Th>Action</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {values.items.map((item, idx) => (
                                <Tr key={idx}>
                                  {/* Item Selector */}
                                  <Td
                                    className={styles.noPaddingCell}
                                    style={{ minWidth: 220, maxWidth: 300 }}
                                  >
                                    <ReactSelect
                                      //   menuPortalTarget={
                                      //     document && document?.body
                                      //   }
                                      options={materialOptions}
                                      value={
                                        materialOptions.find(
                                          (opt) =>
                                            opt.value === item.material_id
                                        ) || null
                                      }
                                      onChange={(selected) =>
                                        setFieldValue(
                                          `items[${idx}].material_id`,
                                          selected ? selected.value : null
                                        )
                                      }
                                      isDisabled={mode === "view"}
                                      isSearchable
                                      placeholder="Select Item"
                                      classNamePrefix="transparentSelect"
                                    />
                                  </Td>
                                  {/* Quantity */}
                                  <Td
                                    className={styles.noPaddingCell}
                                    style={{ minWidth: 100 }}
                                  >
                                    <Input
                                      type="number"
                                      value={item.quantity || ""}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${idx}].quantity`,
                                          e.target.value
                                        )
                                      }
                                      isDisabled={mode === "view"}
                                      min={0}
                                      className={styles.transparentInput}
                                    />
                                  </Td>
                                  {/* Rate */}
                                  <Td
                                    className={styles.noPaddingCell}
                                    style={{ minWidth: 100 }}
                                  >
                                    <Input
                                      type="number"
                                      value={item.rate || ""}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${idx}].rate`,
                                          e.target.value
                                        )
                                      }
                                      isDisabled={mode === "view"}
                                      min={0}
                                      className={styles.transparentInput}
                                    />
                                  </Td>
                                  {/* Amount (auto-calc) */}
                                  <Td
                                    className={styles.noPaddingCell}
                                    style={{
                                      minWidth: 120,
                                      textAlign: "right",
                                    }}
                                  >
                                    <Input
                                      value={
                                        item.quantity && item.rate
                                          ? (
                                              parseFloat(item.quantity) *
                                              parseFloat(item.rate)
                                            ).toFixed(2)
                                          : ""
                                      }
                                      isReadOnly
                                      className={styles.transparentInput}
                                    />
                                  </Td>
                                  {/* Action */}
                                  <Td
                                    className={styles.noPaddingCell}
                                    style={{
                                      minWidth: 60,
                                      textAlign: "center",
                                    }}
                                  >
                                    {mode !== "view" && (
                                      <Button
                                        colorScheme="red"
                                        size="sm"
                                        onClick={() => arrayHelpers.remove(idx)}
                                        style={{
                                          height: "32px",
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>

                          <Flex justifyContent="flex-end">
                            <Button
                              onClick={() =>
                                arrayHelpers.insert(
                                  values.items.length,
                                  EMPTY_ITEM
                                )
                              }
                              mt="22px"
                            >
                              Add Row
                            </Button>
                          </Flex>
                        </div>
                      )}
                    ></FieldArray>
                  </div>
                  {/* Summary Section */}
                  <div
                    style={{
                      background: "#fafbfc",
                      borderRadius: "16px",
                      padding: "32px 24px",
                      marginTop: "40px",
                      maxWidth: 480,
                      marginLeft: "auto",
                      marginRight: 0,
                    }}
                  >
                    <Grid templateColumns="1fr auto" alignItems="center" mb={4}>
                      <b>Sub Total</b>
                      <span style={{ fontWeight: 600, fontSize: 18 }}>
                        {getSubTotal().toFixed(2)}
                      </span>
                    </Grid>
                    <Grid
                      templateColumns="1fr 160px auto"
                      alignItems="center"
                      mb={4}
                      gap={4}
                    >
                      <span>Discount</span>
                      <InputGroup>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          size="md"
                          borderRadius="8px"
                          bg="white"
                          value={values.discount}
                          onChange={(e) =>
                            setFieldValue("discount", e.target.value)
                          }
                        />
                        <InputRightAddon borderRadius="8px">%</InputRightAddon>
                      </InputGroup>
                      <span style={{ textAlign: "right", minWidth: "60px" }}>
                        {getDiscountAmount().toFixed(2)}
                      </span>
                    </Grid>
                    <Grid
                      templateColumns="1fr 160px auto"
                      alignItems="center"
                      mb={4}
                      gap={4}
                    >
                      <span>Adjustment</span>
                      <Input
                        type="number"
                        placeholder=""
                        size="md"
                        borderRadius="8px"
                        bg="white"
                        value={values.adjustment}
                        onChange={(e) =>
                          setFieldValue("adjustment", e.target.value)
                        }
                      />
                      <span style={{ textAlign: "right", minWidth: "60px" }}>
                        {getAdjustment().toFixed(2)}
                      </span>
                    </Grid>
                    <hr style={{ margin: "32px 0 16px 0" }} />
                    <Grid templateColumns="1fr auto" alignItems="center">
                      <b style={{ fontSize: 20 }}>Total</b>
                      <span style={{ fontWeight: 700, fontSize: 22 }}>
                        {getTotal().toFixed(2)}
                      </span>
                    </Grid>
                  </div>
                </div>

                <Flex justifyContent="flex-end" mt="32px" gap="16px">
                  <Link href="/purchase-order" passHref>
                    <Button colorScheme="red" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button colorScheme="purple" onClick={handleSubmit}>
                    Save
                  </Button>
                </Flex>
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseOrder;
