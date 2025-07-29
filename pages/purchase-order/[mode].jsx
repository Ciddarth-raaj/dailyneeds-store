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
  Box,
  VStack,
  HStack,
  Text,
  useBreakpointValue,
  TableContainer,
} from "@chakra-ui/react";
import material from "../../helper/material";
import styles from "../../styles/purchaseOrderTable.module.css";
import usePeople from "../../customHooks/usePeople";
import { usePurchaseOrder } from "../../customHooks/usePurchaseOrder";
import { useUser } from "../../contexts/UserContext";
import ReactSelect from "react-select";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
} from "../../helper/purchase";

const EMPTY_ITEM = {
  material_id: null,
  quantity: null,
  stock: null,
  rate: null,
  purchase_order_item_id: null,
  material_name: null,
  material_description: null,
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
  } else if (values.purchase_order_id.length > 50) {
    return "Purchase Order # cannot exceed 50 characters";
  }

  // Validate purchase_reference_id (optional)
  if (values.purchase_reference_id) {
    if (values.purchase_reference_id.length > 50) {
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

      if (!item.stock) {
        return `Item ${i + 1}: Stock is required`;
      } else if (isNaN(item.stock) || parseFloat(item.stock) < 0) {
        return `Item ${i + 1}: Stock must be 0 or greater`;
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
  const { getLatestPurchaseOrderId } = usePurchaseOrder();
  const { storeId } = useUser().userConfig;

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });

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
  const createMode = mode === "create";

  // State for loading and purchase order data
  const [loading, setLoading] = useState(false);
  const [purchaseOrderData, setPurchaseOrderData] = useState(null);

  // Fetch purchase order data for view/edit modes
  useEffect(() => {
    if ((viewMode || editMode) && paramId) {
      fetchPurchaseOrderData();
    }
  }, [viewMode, editMode, paramId]);

  const fetchPurchaseOrderData = async () => {
    try {
      setLoading(true);
      const response = await getPurchaseOrderById(paramId);
      if (response.code === 200) {
        setPurchaseOrderData(response.data);
      } else {
        toast.error("Failed to fetch purchase order");
        router.push("/purchase-order");
      }
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      toast.error("Error fetching purchase order");
      router.push("/purchase-order");
    } finally {
      setLoading(false);
    }
  };

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
    if (error) {
      toast.error(error);
      return;
    }

    // Prepare data for API
    const purchaseOrderData = createMode
      ? {
          vendor_id: values.vendor_id,
          purchase_order_ref: values.purchase_order_ref,
          purchase_order_id: values.purchase_order_id || null,
          date: values.date ?? null,
          delivery_date: values.delivery_date ?? null,
          discount: parseFloat(values.discount || 0),
          tax: parseFloat(values.tax || 0),
          adjustment: parseFloat(values.adjustment || 0),
          status: "active",
          items: values.items
            .filter(
              (item) =>
                item.material_id && item.quantity && item.stock && item.rate
            )
            .map((item) => ({
              material_id: parseInt(item.material_id),
              quantity: parseInt(item.quantity),
              stock: parseInt(item.stock),
              rate: parseFloat(item.rate),
            })),
        }
      : {
          vendor_id: values.vendor_id,
          purchase_order_ref: values.purchase_order_ref,
          date: values.date ?? null,
          delivery_date: values.delivery_date ?? null,
          discount: parseFloat(values.discount || 0),
          tax: parseFloat(values.tax || 0),
          adjustment: parseFloat(values.adjustment || 0),
          status: "active",
          items: values.items
            .filter(
              (item) =>
                item.material_id && item.quantity && item.stock && item.rate
            )
            .map((item) => ({
              material_id: parseInt(item.material_id),
              quantity: parseInt(item.quantity),
              stock: parseInt(item.stock),
              rate: parseFloat(item.rate),
            })),
        };

    if (createMode) {
      toast.promise(createPurchaseOrder(purchaseOrderData), {
        loading: "Creating purchase order...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/purchase-order");
            return "Purchase order created successfully!";
          } else {
            if (response.msg.includes("ER_DUP_ENTRY")) {
              throw new Error("Purchase Order ID exists");
            }

            throw new Error(
              response.message || "Failed to create purchase order"
            );
          }
        },
        error: (err) => {
          console.log(err);
          return err.message || "Error creating purchase order!";
        },
      });
    } else if (editMode) {
      toast.promise(updatePurchaseOrder(paramId, purchaseOrderData), {
        loading: "Updating purchase order...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/purchase-order");
            return "Purchase order updated successfully!";
          } else {
            throw new Error(
              response.message || "Failed to update purchase order"
            );
          }
        },
        error: (err) => {
          console.log(err);
          return err.message || "Error updating purchase order!";
        },
      });
    }
  };

  if (loading) {
    return (
      <GlobalWrapper>
        <CustomContainer title="Purchase Order" filledHeader>
          <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper>
      <CustomContainer
        title={`Purchase Order ${
          viewMode ? "View" : editMode ? "Edit" : "Create"
        }`}
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={
            purchaseOrderData
              ? {
                  vendor_id: purchaseOrderData.vendor_id,
                  purchase_order_id: purchaseOrderData.purchase_order_id || "",
                  purchase_reference_id:
                    purchaseOrderData.purchase_reference_id || "",
                  date: purchaseOrderData.date,
                  delivery_date: purchaseOrderData.delivery_date,
                  items:
                    purchaseOrderData.items?.length > 0
                      ? purchaseOrderData.items.map((item) => ({
                          material_id: item.material_id,
                          quantity: item.quantity,
                          stock: item.stock || 0,
                          rate: item.rate,
                          purchase_order_item_id: item.purchase_order_item_id,
                          material_name: item.material_name,
                          material_description: item.material_description,
                        }))
                      : [EMPTY_ITEM],
                  discount: purchaseOrderData.discount || 0,
                  tax: purchaseOrderData.tax || 0,
                  adjustment: purchaseOrderData.adjustment || 0,
                }
              : {
                  vendor_id: null,
                  purchase_order_id:
                    parseInt(getLatestPurchaseOrderId() ?? 0) + 1 || "",
                  purchase_reference_id: "",
                  date: new Date(),
                  delivery_date: (() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow;
                  })(),
                  items: [EMPTY_ITEM],
                  discount: 0,
                  tax: 0,
                  adjustment: 0,
                }
          }
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

            const getTaxAmount = () => {
              const subTotal = getSubTotal();
              const taxPercent = parseFloat(values.tax || 0);
              return subTotal * (taxPercent / 100);
            };

            const getAdjustment = () => {
              return parseFloat(values.adjustment || 0);
            };

            const getTotal = () => {
              const subTotal = getSubTotal();
              const discount = getDiscountAmount();
              const tax = getTaxAmount();
              const adjustment = getAdjustment();
              return subTotal - discount + tax + adjustment;
            };

            return (
              <Box>
                <Box>
                  <CustomInput
                    label="Vendor Name"
                    name="vendor_id"
                    method="switch"
                    values={filtersPeopleList}
                    placeholder="Select Vendor"
                    editable={!viewMode}
                  />
                </Box>

                <hr />

                <Box mt="32px">
                  {/* Desktop Layout */}
                  <Box display={{ base: "none", md: "block" }}>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <CustomInput
                        label="Purchase Order #"
                        name="purchase_order_id"
                        placeholder="12B6G"
                        editable={!viewMode && !editMode}
                      />
                      <CustomInput
                        label="Purchase Reference #"
                        name="purchase_reference_id"
                        placeholder="12B6G"
                        editable={!viewMode}
                      />
                    </Grid>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                      <CustomInput
                        label="Date"
                        name="date"
                        placeholder="DD/MM/YYYY"
                        editable={!viewMode}
                        method="datepicker"
                      />
                      <CustomInput
                        label="Delivery Date"
                        name="delivery_date"
                        placeholder="DD/MM/YYYY"
                        editable={!viewMode}
                        method="datepicker"
                      />
                    </Grid>
                  </Box>

                  {/* Mobile Layout */}
                  <Box display={{ base: "block", md: "none" }}>
                    <VStack spacing={4}>
                      <CustomInput
                        label="Purchase Order #"
                        name="purchase_order_id"
                        placeholder="12B6G"
                        editable={!viewMode && !editMode}
                      />
                      <CustomInput
                        label="Purchase Reference #"
                        name="purchase_reference_id"
                        placeholder="12B6G"
                        editable={!viewMode}
                      />
                      <CustomInput
                        label="Date"
                        name="date"
                        placeholder="DD/MM/YYYY"
                        editable={!viewMode}
                        method="datepicker"
                      />
                      <CustomInput
                        label="Delivery Date"
                        name="delivery_date"
                        placeholder="DD/MM/YYYY"
                        editable={!viewMode}
                        method="datepicker"
                      />
                    </VStack>
                  </Box>

                  <Box mt="22px">
                    <FieldArray
                      name="items"
                      render={(arrayHelpers) => (
                        <Box>
                          {/* Desktop Table */}
                          <Box display={{ base: "none", md: "block" }}>
                            <Table
                              variant="striped"
                              sx={{
                                "tbody tr:nth-of-type(odd) td": {
                                  background: "#f7f7f7",
                                },
                              }}
                            >
                              <Thead>
                                <Tr>
                                  <Th>Item</Th>
                                  <Th>Quantity</Th>
                                  <Th>Stock</Th>
                                  <Th>Rate</Th>
                                  <Th>Amount</Th>
                                  <Th>Action</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {values.items.map((item, idx) => (
                                  <Tr key={idx}>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 220, maxWidth: 300 }}
                                    >
                                      <ReactSelect
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
                                        isDisabled={viewMode}
                                        isSearchable
                                        placeholder="Select Item"
                                        classNamePrefix="transparentSelect"
                                      />
                                    </Td>
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
                                        isDisabled={viewMode}
                                        min={0}
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.stock || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].stock`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        className={styles.transparentInput}
                                      />
                                    </Td>
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
                                        isDisabled={viewMode}
                                        min={0}
                                        className={styles.transparentInput}
                                      />
                                    </Td>
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
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{
                                        minWidth: 60,
                                        textAlign: "center",
                                      }}
                                    >
                                      {!viewMode && (
                                        <Button
                                          colorScheme="red"
                                          size="sm"
                                          onClick={() =>
                                            arrayHelpers.remove(idx)
                                          }
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
                          </Box>

                          {/* Mobile Cards */}
                          <Box display={{ base: "block", md: "none" }}>
                            <VStack spacing={4} align="stretch">
                              {values.items.map((item, idx) => (
                                <Box
                                  key={idx}
                                  border="1px solid"
                                  borderColor="gray.200"
                                  borderRadius="md"
                                  p={4}
                                  bg="white"
                                >
                                  <VStack spacing={3} align="stretch">
                                    <Box>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Item
                                      </Text>
                                      <ReactSelect
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
                                        isDisabled={viewMode}
                                        isSearchable
                                        placeholder="Select Item"
                                        classNamePrefix="transparentSelect"
                                      />
                                    </Box>

                                    <HStack spacing={3}>
                                      <Box flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          mb={2}
                                        >
                                          Quantity
                                        </Text>
                                        <Input
                                          type="number"
                                          value={item.quantity || ""}
                                          onChange={(e) =>
                                            setFieldValue(
                                              `items[${idx}].quantity`,
                                              e.target.value
                                            )
                                          }
                                          isDisabled={viewMode}
                                          min={0}
                                          size="sm"
                                        />
                                      </Box>
                                      <Box flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          mb={2}
                                        >
                                          Stock
                                        </Text>
                                        <Input
                                          type="number"
                                          value={item.stock || ""}
                                          onChange={(e) =>
                                            setFieldValue(
                                              `items[${idx}].stock`,
                                              e.target.value
                                            )
                                          }
                                          isDisabled={viewMode}
                                          min={0}
                                          size="sm"
                                        />
                                      </Box>
                                    </HStack>

                                    <HStack spacing={3}>
                                      <Box flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          mb={2}
                                        >
                                          Rate
                                        </Text>
                                        <Input
                                          type="number"
                                          value={item.rate || ""}
                                          onChange={(e) =>
                                            setFieldValue(
                                              `items[${idx}].rate`,
                                              e.target.value
                                            )
                                          }
                                          isDisabled={viewMode}
                                          min={0}
                                          size="sm"
                                        />
                                      </Box>
                                      <Box flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          mb={2}
                                        >
                                          Amount
                                        </Text>
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
                                          size="sm"
                                          bg="gray.50"
                                        />
                                      </Box>
                                    </HStack>

                                    {!viewMode && (
                                      <Flex justifyContent="flex-end">
                                        <Button
                                          colorScheme="red"
                                          size="sm"
                                          onClick={() =>
                                            arrayHelpers.remove(idx)
                                          }
                                        >
                                          Delete
                                        </Button>
                                      </Flex>
                                    )}
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          </Box>

                          {!viewMode && (
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
                          )}
                        </Box>
                      )}
                    ></FieldArray>
                  </Box>

                  {/* Summary Section */}
                  <Box
                    bg="#fafbfc"
                    borderRadius="16px"
                    p={{ base: "24px 16px", md: "32px 24px" }}
                    mt="40px"
                    maxW={{ base: "100%", md: "480px" }}
                    ml={{ base: "0", md: "auto" }}
                    mr="0"
                  >
                    {/* Desktop Summary Layout */}
                    <Box display={{ base: "none", md: "block" }}>
                      <Grid
                        templateColumns="1fr auto"
                        alignItems="center"
                        mb={4}
                      >
                        <Text fontWeight="bold">Sub Total</Text>
                        <Text fontWeight="600" fontSize="18">
                          {getSubTotal().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr 160px auto"
                        alignItems="center"
                        mb={4}
                        gap={4}
                      >
                        <Text>Discount</Text>
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
                            isDisabled={viewMode}
                          />
                          <InputRightAddon borderRadius="8px">
                            %
                          </InputRightAddon>
                        </InputGroup>
                        <Text textAlign="right" minW="60px">
                          {getDiscountAmount().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr 160px auto"
                        alignItems="center"
                        mb={4}
                        gap={4}
                      >
                        <Text>Tax</Text>
                        <InputGroup>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            size="md"
                            borderRadius="8px"
                            bg="white"
                            value={values.tax}
                            onChange={(e) =>
                              setFieldValue("tax", e.target.value)
                            }
                            isDisabled={viewMode}
                          />
                          <InputRightAddon borderRadius="8px">
                            %
                          </InputRightAddon>
                        </InputGroup>
                        <Text textAlign="right" minW="60px">
                          {getTaxAmount().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr 160px auto"
                        alignItems="center"
                        mb={4}
                        gap={4}
                      >
                        <Text>Adjustment</Text>
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
                          isDisabled={viewMode}
                        />
                        <Text textAlign="right" minW="60px">
                          {getAdjustment().toFixed(2)}
                        </Text>
                      </Grid>

                      <hr style={{ margin: "32px 0 16px 0" }} />
                      <Grid templateColumns="1fr auto" alignItems="center">
                        <Text fontWeight="bold" fontSize="20">
                          Total
                        </Text>
                        <Text fontWeight="700" fontSize="22">
                          {getTotal().toFixed(2)}
                        </Text>
                      </Grid>
                    </Box>

                    {/* Mobile Summary Layout */}
                    <Box display={{ base: "block", md: "none" }}>
                      <VStack spacing={6} align="stretch">
                        {/* Sub Total */}
                        <Box
                          bg="white"
                          p={4}
                          borderRadius="12px"
                          border="1px solid"
                          borderColor="gray.200"
                          boxShadow="sm"
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontWeight="600" fontSize="16">
                              Sub Total
                            </Text>
                            <Text
                              fontWeight="700"
                              fontSize="18"
                              color="blue.600"
                            >
                              ₹{getSubTotal().toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>

                        {/* Discount */}
                        <Box
                          bg="white"
                          p={4}
                          borderRadius="12px"
                          border="1px solid"
                          borderColor="gray.200"
                          boxShadow="sm"
                        >
                          <VStack spacing={3} align="stretch">
                            <Flex
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text fontWeight="500" fontSize="15">
                                Discount
                              </Text>
                              <Text
                                fontWeight="600"
                                fontSize="16"
                                color="red.500"
                              >
                                -₹{getDiscountAmount().toFixed(2)}
                              </Text>
                            </Flex>
                            <InputGroup>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0"
                                size="md"
                                borderRadius="8px"
                                bg="gray.50"
                                value={values.discount}
                                onChange={(e) =>
                                  setFieldValue("discount", e.target.value)
                                }
                                isDisabled={viewMode}
                              />
                              <InputRightAddon borderRadius="8px" bg="gray.100">
                                %
                              </InputRightAddon>
                            </InputGroup>
                          </VStack>
                        </Box>

                        {/* Tax */}
                        <Box
                          bg="white"
                          p={4}
                          borderRadius="12px"
                          border="1px solid"
                          borderColor="gray.200"
                          boxShadow="sm"
                        >
                          <VStack spacing={3} align="stretch">
                            <Flex
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text fontWeight="500" fontSize="15">
                                Tax
                              </Text>
                              <Text
                                fontWeight="600"
                                fontSize="16"
                                color="green.500"
                              >
                                +₹{getTaxAmount().toFixed(2)}
                              </Text>
                            </Flex>
                            <InputGroup>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0"
                                size="md"
                                borderRadius="8px"
                                bg="gray.50"
                                value={values.tax}
                                onChange={(e) =>
                                  setFieldValue("tax", e.target.value)
                                }
                                isDisabled={viewMode}
                              />
                              <InputRightAddon borderRadius="8px" bg="gray.100">
                                %
                              </InputRightAddon>
                            </InputGroup>
                          </VStack>
                        </Box>

                        {/* Adjustment */}
                        <Box
                          bg="white"
                          p={4}
                          borderRadius="12px"
                          border="1px solid"
                          borderColor="gray.200"
                          boxShadow="sm"
                        >
                          <VStack spacing={3} align="stretch">
                            <Flex
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text fontWeight="500" fontSize="15">
                                Adjustment
                              </Text>
                              <Text
                                fontWeight="600"
                                fontSize="16"
                                color={
                                  getAdjustment() >= 0 ? "green.500" : "red.500"
                                }
                              >
                                {getAdjustment() >= 0 ? "+" : ""}₹
                                {getAdjustment().toFixed(2)}
                              </Text>
                            </Flex>
                            <Input
                              type="number"
                              placeholder="0"
                              size="md"
                              borderRadius="8px"
                              bg="gray.50"
                              value={values.adjustment}
                              onChange={(e) =>
                                setFieldValue("adjustment", e.target.value)
                              }
                              isDisabled={viewMode}
                            />
                          </VStack>
                        </Box>

                        {/* Total */}
                        <Box
                          bg="purple.50"
                          p={5}
                          borderRadius="16px"
                          border="2px solid"
                          borderColor="purple.200"
                          boxShadow="md"
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text
                              fontWeight="700"
                              fontSize="18"
                              color="purple.700"
                            >
                              Total
                            </Text>
                            <Text
                              fontWeight="800"
                              fontSize="22"
                              color="purple.700"
                            >
                              ₹{getTotal().toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>
                      </VStack>
                    </Box>
                  </Box>
                </Box>

                <Flex
                  justifyContent="flex-end"
                  mt="32px"
                  gap="16px"
                  direction={{ base: "column", md: "row" }}
                >
                  <Link href="/purchase-order" passHref>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      w={{ base: "100%", md: "auto" }}
                    >
                      {viewMode ? "Back" : "Cancel"}
                    </Button>
                  </Link>
                  {!viewMode && (
                    <Button
                      colorScheme="purple"
                      onClick={handleSubmit}
                      w={{ base: "100%", md: "auto" }}
                    >
                      {editMode ? "Update" : "Save"}
                    </Button>
                  )}
                </Flex>
              </Box>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseOrder;
