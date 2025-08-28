import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomInput from "../../components/customInput/customInput";
import { useRouter } from "next/router";
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
import product from "../../helper/product";
import styles from "../../styles/purchaseOrderTable.module.css";
import { useUser } from "../../contexts/UserContext";
import ReactSelect from "react-select";
import toast from "react-hot-toast";
import Link from "next/link";

const EMPTY_ITEM = {
  product_id: null,
  quantity: null,
  cost: null,
  discount: null,
  tax: null,
  tax_amount: null,
  markup_percentage: null,
  final_selling_price: null,
  puom: null,
  suom: null,
  // Calculated fields
  netcost: null,
  netamount: null,
  selling_price: null,
  margin: null,
  box: null,
  product_name: null,
  product_description: null,
};

// Manual validation function
const validateForm = (values) => {
  // Validate invoice_id
  if (!values.invoice_id) {
    return "Invoice # is required";
  } else if (values.invoice_id.length > 100) {
    return "Invoice # cannot exceed 100 characters";
  }

  // Validate items
  if (!values.items || values.items.length === 0) {
    return "At least one item is required";
  } else {
    for (let i = 0; i < values.items.length; i++) {
      const item = values.items[i];

      if (!item.product_id) {
        return `Item ${i + 1}: Product is required`;
      }

      if (!item.quantity) {
        return `Item ${i + 1}: Quantity is required`;
      } else if (isNaN(item.quantity) || parseFloat(item.quantity) <= 0) {
        return `Item ${i + 1}: Quantity must be greater than 0`;
      }

      if (!item.cost) {
        return `Item ${i + 1}: Cost is required`;
      } else if (isNaN(item.cost) || parseFloat(item.cost) <= 0) {
        return `Item ${i + 1}: Cost must be greater than 0`;
      }

      if (
        item.discount !== null &&
        item.discount !== undefined &&
        item.discount !== ""
      ) {
        if (isNaN(item.discount) || parseFloat(item.discount) < 0) {
          return `Item ${i + 1}: Discount must be 0 or greater`;
        }
      }

      if (item.tax !== null && item.tax !== undefined && item.tax !== "") {
        if (isNaN(item.tax) || parseFloat(item.tax) < 0) {
          return `Item ${i + 1}: Tax must be 0 or greater`;
        }
      }

      if (
        item.markup_percentage !== null &&
        item.markup_percentage !== undefined &&
        item.markup_percentage !== ""
      ) {
        if (
          isNaN(item.markup_percentage) ||
          parseFloat(item.markup_percentage) < 0
        ) {
          return `Item ${i + 1}: Markup percentage must be 0 or greater`;
        }
      }
    }
  }

  return null; // No errors found
};

function InvoiceEditor() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;

  const { storeId } = useUser().userConfig;

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  // State for loading and invoice data
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Fetch products for dropdown
  const [productOptions, setProductOptions] = useState([]);
  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await product.getAll();
        setProductOptions(
          (data || []).map((prod) => ({
            value: prod.product_id,
            label: `${prod.product_id} - ${prod.name}`,
            ...prod,
          }))
        );
      } catch (err) {
        setProductOptions([]);
      }
    }
    fetchProducts();
  }, []);

  const handleSubmit = (values) => {
    const error = validateForm(values);
    if (error) {
      toast.error(error);
      return;
    }

    // Prepare data for API
    const invoiceData = {
      invoice_id: values.invoice_id,
      items: values.items
        .filter((item) => item.product_id && item.quantity && item.cost)
        .map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          cost: parseFloat(item.cost),
          discount: parseFloat(item.discount || 0),
          tax: parseFloat(item.tax || 0),
          tax_amount: parseFloat(item.tax_amount || 0),
          markup_percentage: parseFloat(item.markup_percentage || 0),
          final_selling_price: parseFloat(item.final_selling_price || 0),
          puom: item.puom || null,
          suom: item.suom || null,
        })),
    };

    if (createMode) {
      toast.promise(
        // TODO: Replace with actual API call
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ code: 200, message: "Invoice created successfully" });
          }, 1000);
        }),
        {
          loading: "Creating invoice...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/invoice");
              return "Invoice created successfully!";
            } else {
              throw new Error(response.message || "Failed to create invoice");
            }
          },
          error: (err) => {
            console.log(err);
            return err.message || "Error creating invoice!";
          },
        }
      );
    } else if (editMode) {
      toast.promise(
        // TODO: Replace with actual API call
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ code: 200, message: "Invoice updated successfully" });
          }, 1000);
        }),
        {
          loading: "Updating invoice...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/invoice");
              return "Invoice updated successfully!";
            } else {
              throw new Error(response.message || "Failed to update invoice");
            }
          },
          error: (err) => {
            console.log(err);
            return err.message || "Error updating invoice!";
          },
        }
      );
    }
  };

  if (loading) {
    return (
      <GlobalWrapper>
        <CustomContainer title="Invoice" filledHeader>
          <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Invoice">
      <CustomContainer
        title={`${viewMode ? "View" : editMode ? "Edit" : "Create"} Invoice`}
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={
            invoiceData
              ? {
                  invoice_id: invoiceData.invoice_id || "",
                  items:
                    invoiceData.items?.length > 0
                      ? invoiceData.items.map((item) => ({
                          product_id: item.product_id,
                          quantity: item.quantity,
                          cost: item.cost,
                          discount: item.discount || 0,
                          tax: item.tax || 0,
                          tax_amount: item.tax_amount || 0,
                          markup_percentage: item.markup_percentage || 0,
                          final_selling_price: item.final_selling_price || 0,
                          puom: item.puom || null,
                          suom: item.suom || null,
                          // Calculated fields
                          netcost: item.netcost || 0,
                          netamount: item.netamount || 0,
                          selling_price: item.selling_price || 0,
                          margin: item.margin || 0,
                          box: item.box || 0,
                          product_name: item.product_name,
                          product_description: item.product_description,
                        }))
                      : [EMPTY_ITEM],
                }
              : {
                  invoice_id: `INV-${Date.now()}`,
                  items: [EMPTY_ITEM],
                }
          }
          onSubmit={handleSubmit}
        >
          {({ handleSubmit, values, setFieldValue }) => {
            // Calculate item fields
            const calculateItemFields = (item) => {
              const quantity = parseFloat(item.quantity || 0);
              const cost = parseFloat(item.cost || 0);
              const discount = parseFloat(item.discount || 0);
              const tax = parseFloat(item.tax || 0);
              const markup_percentage = parseFloat(item.markup_percentage || 0);
              const suom = parseFloat(item.suom || 1);

              // netcost = cost + (cost * tax / 100) - (cost * discount / 100)
              const netcost =
                cost + (cost * tax) / 100 - (cost * discount) / 100;

              // netamount = quantity * netcost
              const netamount = quantity * netcost;

              // taxamount = (cost * qty) * tax / 100
              const tax_amount = (cost * quantity * tax) / 100;

              // selling_price = netamount * markup_percentage / 100
              const selling_price = markup_percentage
                ? netcost + (netcost * markup_percentage) / 100
                : netcost;

              // final_price = netamount * markup_percentage / 100 (can be edited by user)
              const final_selling_price = parseFloat(
                item.final_selling_price || selling_price
              );

              // margin = final_price - netamount
              const margin = final_selling_price - netcost;

              // box = qty / suom
              const box = quantity / suom;

              return {
                netcost: netcost.toFixed(2),
                netamount: netamount.toFixed(2),
                tax_amount: tax_amount.toFixed(2),
                selling_price: selling_price.toFixed(2),
                margin: margin.toFixed(2),
                box: box.toFixed(2),
              };
            };

            // Calculate totals
            const getTotalNetAmount = () => {
              return (values.items || []).reduce(
                (sum, item) =>
                  sum + parseFloat(calculateItemFields(item).netamount),
                0
              );
            };

            const getTotalTaxAmount = () => {
              return (values.items || []).reduce(
                (sum, item) =>
                  sum + parseFloat(calculateItemFields(item).tax_amount),
                0
              );
            };

            const getTotalFinalPrice = () => {
              return (values.items || []).reduce(
                (sum, item) => sum + parseFloat(item.final_selling_price || 0),
                0
              );
            };

            const getTotalMargin = () => {
              return (values.items || []).reduce(
                (sum, item) =>
                  sum + parseFloat(calculateItemFields(item).margin),
                0
              );
            };

            return (
              <Box>
                <Box>
                  <CustomInput
                    label="Invoice #"
                    name="invoice_id"
                    placeholder="INV-001"
                    editable={!viewMode && !editMode}
                  />
                </Box>

                <hr />

                <Box mt="32px">
                  {/* Desktop Layout */}
                  <Box display={{ base: "none", md: "block" }}>
                    <FieldArray
                      name="items"
                      render={(arrayHelpers) => (
                        <Box>
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
                                <Th>Product</Th>
                                <Th>Quantity</Th>
                                <Th>Cost</Th>
                                <Th>Discount (%)</Th>
                                <Th>Tax (%)</Th>
                                <Th>Tax Amount</Th>
                                <Th>Markup (%)</Th>
                                <Th>Net Cost</Th>
                                <Th>Net Amount</Th>
                                <Th>Selling Price</Th>
                                <Th>Final Price</Th>
                                <Th>Margin</Th>
                                <Th>Box</Th>
                                <Th>PUOM</Th>
                                <Th>SUOM</Th>
                                <Th>Action</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {values.items.map((item, idx) => {
                                return (
                                  <Tr key={idx}>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 200, maxWidth: 250 }}
                                    >
                                      <ReactSelect
                                        options={productOptions}
                                        value={
                                          productOptions.find(
                                            (opt) =>
                                              opt.value === item.product_id
                                          ) || null
                                        }
                                        onChange={(selected) => {
                                          setFieldValue(
                                            `items[${idx}].product_id`,
                                            selected ? selected.value : null
                                          );
                                          if (selected) {
                                            setFieldValue(
                                              `items[${idx}].product_name`,
                                              selected.name
                                            );
                                            setFieldValue(
                                              `items[${idx}].product_description`,
                                              selected.description
                                            );
                                          }
                                        }}
                                        isDisabled={viewMode}
                                        isSearchable
                                        placeholder="Select Product"
                                        classNamePrefix="transparentSelect"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
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
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.cost || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].cost`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.discount || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].discount`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.tax || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].tax`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        value={
                                          calculateItemFields(item).tax_amount
                                        }
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.markup_percentage || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].markup_percentage`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        value={
                                          calculateItemFields(item).netcost
                                        }
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        value={
                                          calculateItemFields(item).netamount
                                        }
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        value={
                                          calculateItemFields(item)
                                            .selling_price
                                        }
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        type="number"
                                        value={item.final_selling_price || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].final_selling_price`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        step="0.01"
                                        className={styles.transparentInput}
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 100 }}
                                    >
                                      <Input
                                        value={calculateItemFields(item).margin}
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        value={calculateItemFields(item).box}
                                        isReadOnly
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        value={item.puom || ""}
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].puom`,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Td>
                                    <Td
                                      className={styles.noPaddingCell}
                                      style={{ minWidth: 80 }}
                                    >
                                      <Input
                                        value={item.suom || ""}
                                        className={styles.transparentInput}
                                        bg="gray.50"
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].suom`,
                                            e.target.value
                                          )
                                        }
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
                                );
                              })}
                            </Tbody>
                          </Table>
                        </Box>
                      )}
                    ></FieldArray>
                  </Box>

                  {/* Mobile Cards */}
                  <Box display={{ base: "block", md: "none" }}>
                    <FieldArray
                      name="items"
                      render={(arrayHelpers) => (
                        <VStack spacing={4} align="stretch">
                          {values.items.map((item, idx) => {
                            return (
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
                                      Product
                                    </Text>
                                    <ReactSelect
                                      options={productOptions}
                                      value={
                                        productOptions.find(
                                          (opt) => opt.value === item.product_id
                                        ) || null
                                      }
                                      onChange={(selected) => {
                                        setFieldValue(
                                          `items[${idx}].product_id`,
                                          selected ? selected.value : null
                                        );
                                        if (selected) {
                                          setFieldValue(
                                            `items[${idx}].product_name`,
                                            selected.name
                                          );
                                          setFieldValue(
                                            `items[${idx}].product_description`,
                                            selected.description
                                          );
                                          setFieldValue(
                                            `items[${idx}].puom`,
                                            selected.puom || null
                                          );
                                          setFieldValue(
                                            `items[${idx}].suom`,
                                            selected.suom || 1
                                          );
                                        }
                                      }}
                                      isDisabled={viewMode}
                                      isSearchable
                                      placeholder="Select Product"
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
                                        step="0.01"
                                        size="sm"
                                      />
                                    </Box>
                                    <Box flex={1}>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Cost
                                      </Text>
                                      <Input
                                        type="number"
                                        value={item.cost || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].cost`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        step="0.01"
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
                                        Discount (%)
                                      </Text>
                                      <Input
                                        type="number"
                                        value={item.discount || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].discount`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        size="sm"
                                      />
                                    </Box>
                                    <Box flex={1}>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Tax (%)
                                      </Text>
                                      <Input
                                        type="number"
                                        value={item.tax || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].tax`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
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
                                        Markup (%)
                                      </Text>
                                      <Input
                                        type="number"
                                        value={item.markup_percentage || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].markup_percentage`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        size="sm"
                                      />
                                    </Box>
                                    <Box flex={1}>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Final Price
                                      </Text>
                                      <Input
                                        type="number"
                                        value={item.final_selling_price || ""}
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${idx}].final_selling_price`,
                                            e.target.value
                                          )
                                        }
                                        isDisabled={viewMode}
                                        min={0}
                                        step="0.01"
                                        size="sm"
                                      />
                                    </Box>
                                  </HStack>

                                  {/* Calculated Fields */}
                                  <Box
                                    bg="gray.50"
                                    p={3}
                                    borderRadius="md"
                                    border="1px solid"
                                    borderColor="gray.200"
                                  >
                                    <VStack spacing={2} align="stretch">
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Net Cost:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          ₹{calculateItemFields(item).netcost}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Net Amount:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          ₹{calculateItemFields(item).netamount}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Tax Amount:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          ₹
                                          {calculateItemFields(item).tax_amount}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Selling Price:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          ₹
                                          {
                                            calculateItemFields(item)
                                              .selling_price
                                          }
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Margin:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          ₹{calculateItemFields(item).margin}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight="medium">
                                          Box:
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600">
                                          {calculateItemFields(item).box}
                                        </Text>
                                      </HStack>
                                    </VStack>
                                  </Box>

                                  {!viewMode && (
                                    <Flex justifyContent="flex-end">
                                      <Button
                                        colorScheme="red"
                                        size="sm"
                                        onClick={() => arrayHelpers.remove(idx)}
                                      >
                                        Delete
                                      </Button>
                                    </Flex>
                                  )}
                                </VStack>
                              </Box>
                            );
                          })}
                        </VStack>
                      )}
                    ></FieldArray>
                  </Box>

                  {!viewMode && (
                    <Flex justifyContent="flex-end">
                      <Button
                        onClick={() =>
                          arrayHelpers.insert(values.items.length, EMPTY_ITEM)
                        }
                        mt="22px"
                      >
                        Add Row
                      </Button>
                    </Flex>
                  )}
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
                    <Grid templateColumns="1fr auto" alignItems="center" mb={4}>
                      <Text fontWeight="bold">Total Net Amount</Text>
                      <Text fontWeight="600" fontSize="18">
                        ₹{getTotalNetAmount().toFixed(2)}
                      </Text>
                    </Grid>

                    <Grid templateColumns="1fr auto" alignItems="center" mb={4}>
                      <Text>Total Tax Amount</Text>
                      <Text textAlign="right" minW="60px">
                        ₹{getTotalTaxAmount().toFixed(2)}
                      </Text>
                    </Grid>

                    <Grid templateColumns="1fr auto" alignItems="center" mb={4}>
                      <Text>Total Final Price</Text>
                      <Text textAlign="right" minW="60px">
                        ₹{getTotalFinalPrice().toFixed(2)}
                      </Text>
                    </Grid>

                    <hr style={{ margin: "32px 0 16px 0" }} />
                    <Grid templateColumns="1fr auto" alignItems="center">
                      <Text fontWeight="bold" fontSize="20">
                        Total Margin
                      </Text>
                      <Text fontWeight="700" fontSize="22">
                        ₹{getTotalMargin().toFixed(2)}
                      </Text>
                    </Grid>
                  </Box>

                  {/* Mobile Summary Layout */}
                  <Box display={{ base: "block", md: "none" }}>
                    <VStack spacing={6} align="stretch">
                      {/* Total Net Amount */}
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
                            Total Net Amount
                          </Text>
                          <Text fontWeight="700" fontSize="18" color="blue.600">
                            ₹{getTotalNetAmount().toFixed(2)}
                          </Text>
                        </Flex>
                      </Box>

                      {/* Total Tax Amount */}
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
                          <Text fontWeight="500" fontSize="15">
                            Total Tax Amount
                          </Text>
                          <Text
                            fontWeight="600"
                            fontSize="16"
                            color="green.500"
                          >
                            ₹{getTotalTaxAmount().toFixed(2)}
                          </Text>
                        </Flex>
                      </Box>

                      {/* Total Final Price */}
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
                          <Text fontWeight="500" fontSize="15">
                            Total Final Price
                          </Text>
                          <Text
                            fontWeight="600"
                            fontSize="16"
                            color="purple.500"
                          >
                            ₹{getTotalFinalPrice().toFixed(2)}
                          </Text>
                        </Flex>
                      </Box>

                      {/* Total Margin */}
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
                            Total Margin
                          </Text>
                          <Text
                            fontWeight="800"
                            fontSize="22"
                            color="purple.700"
                          >
                            ₹{getTotalMargin().toFixed(2)}
                          </Text>
                        </Flex>
                      </Box>
                    </VStack>
                  </Box>
                </Box>

                <Flex
                  justifyContent="flex-end"
                  mt="32px"
                  gap="16px"
                  direction={{ base: "column", md: "row" }}
                >
                  <Link href="/invoice" passHref>
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

export default InvoiceEditor;
