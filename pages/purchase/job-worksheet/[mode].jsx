import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import {
  Button,
  Flex,
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Text,
  Box,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import usePeople from "../../../customHooks/usePeople";
import { useJobWorksheetById } from "../../../customHooks/useJobWorksheetById";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import {
  createJobWorksheet,
  updateJobWorksheet,
} from "../../../helper/jobWorksheet";
import { capitalize } from "../../../util/string";

const ITEMS_COLUMN_CONFIG = [
  {
    key: "product_id",
    label: "Item Code",
    required: true,
    suggestedKey: "Item Code",
    type: "number",
  },
  {
    key: "qty",
    label: "Rec Qty",
    required: true,
    suggestedKey: "Rec Qty",
    type: "number",
  },
  {
    key: "mrp",
    label: "MRP",
    required: true,
    suggestedKey: "MRP",
    type: "number",
  },
];

const validationSchema = Yup.object({
  grn_no: Yup.string().required("GRN No is required").trim(),
  date: Yup.string().required("Date is required"),
  supplier_id: Yup.number().required("Supplier is required").nullable(),
  items: Yup.array().of(
    Yup.object({
      product_id: Yup.number().required("Product is required").nullable(),
      qty: Yup.number().min(0, "Qty must be ≥ 0").required("Qty is required"),
      mrp: Yup.number().min(0, "MRP must be ≥ 0").required("MRP is required"),
    })
  ),
});

function JobWorksheetMode() {
  const router = useRouter();
  const { mode, id } = router.query;
  const worksheetId = id ? parseInt(id, 10) : null;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { worksheet, loading: loadingWorksheet } = useJobWorksheetById(
    worksheetId,
    { enabled: (viewMode || editMode) && !!worksheetId, withItems: true }
  );
  const { peopleList } = usePeople();

  const supplierOptions = useMemo(
    () =>
      peopleList.map((p) => ({
        id: p.person_id,
        value: p.name || `Person #${p.person_id}`,
      })),
    [peopleList]
  );

  const [initialValues, setInitialValues] = useState({
    grn_no: "",
    date: "",
    supplier_id: null,
    items: [],
  });

  useEffect(() => {
    if (createMode) {
      setInitialValues({
        grn_no: "",
        date: new Date().toISOString().slice(0, 10),
        supplier_id: null,
        items: [],
      });
      return;
    }
    if (worksheet) {
      const dateStr = worksheet.date
        ? new Date(worksheet.date).toISOString().slice(0, 10)
        : "";
      setInitialValues({
        grn_no: worksheet.grn_no || "",
        date: dateStr,
        supplier_id: worksheet.supplier_id ?? null,
        items: (worksheet.items || []).map((it) => ({
          product_id: it.product_id,
          qty: it.qty,
          mrp: it.mrp,
        })),
      });
    }
  }, [createMode, worksheet]);

  const handleMappedItems = (setFieldValue) => (mappedRows) => {
    const valid = mappedRows.filter(
      (r) =>
        r.product_id != null &&
        r.qty != null &&
        r.mrp != null &&
        Number(r.qty) >= 0 &&
        Number(r.mrp) >= 0
    );
    setFieldValue("items", valid);
    toast.success(`Imported ${valid.length} item(s)`);
  };

  const handleSubmit = async (values) => {
    const payload = {
      grn_no: values.grn_no.trim(),
      date: values.date,
      supplier_id: parseInt(values.supplier_id, 10),
      items: values.items.map((it) => ({
        product_id: parseInt(it.product_id, 10),
        qty: parseInt(Number(it.qty), 10),
        mrp: Number(it.mrp),
      })),
    };

    if (createMode) {
      try {
        const res = await createJobWorksheet(payload);
        if (res?.id) {
          toast.success("Job worksheet created");
          router.push(`/purchase/job-worksheet/edit?id=${res.id}`);
        } else {
          toast.error(res?.msg || "Create failed");
        }
      } catch (err) {
        toast.error(err.message || "Failed to create job worksheet");
      }
      return;
    }

    if (editMode && worksheetId) {
      try {
        await updateJobWorksheet(worksheetId, payload);
        toast.success("Job worksheet updated");
        router.push("/purchase/job-worksheet");
      } catch (err) {
        toast.error(err.message || "Failed to update job worksheet");
      }
    }
  };

  if ((viewMode || editMode) && !worksheet && loadingWorksheet) {
    return (
      <GlobalWrapper title="Job Worksheet">
        <CustomContainer title="Loading..." filledHeader>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (
    (viewMode || editMode) &&
    !loadingWorksheet &&
    !worksheet &&
    worksheetId
  ) {
    return (
      <GlobalWrapper title="Job Worksheet">
        <CustomContainer title="Not found" filledHeader>
          <Text>Job worksheet not found.</Text>
          <Button
            mt={4}
            colorScheme="purple"
            onClick={() => router.push("/purchase/job-worksheet")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Job Worksheet"
    : editMode
    ? "Edit Job Worksheet"
    : "Create Job Worksheet";

  return (
    <GlobalWrapper title={title} permissionKey="view_job_worksheet">
      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, handleSubmit: formikSubmit }) => {
            const hasItems = (values.items?.length ?? 0) > 0;
            const showUploadOnly = !viewMode && !hasItems;

            return (
              <form onSubmit={formikSubmit}>
                {showUploadOnly ? (
                  <Box mb={4}>
                    <Text
                      fontWeight="600"
                      fontSize="sm"
                      color="purple.700"
                      mb={2}
                    >
                      Upload items (XLSX/CSV)
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Upload a file to get started. After mapping columns, you
                      can enter GRN No, Date, Supplier and submit.
                    </Text>
                    <FileUploaderWithColumnMapping
                      config={ITEMS_COLUMN_CONFIG}
                      onMappedData={handleMappedItems(setFieldValue)}
                    />
                  </Box>
                ) : (
                  <>
                    <Grid
                      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                      gap={4}
                      mb={6}
                    >
                      <CustomInput
                        label="GRN No"
                        name="grn_no"
                        type="text"
                        editable={!viewMode}
                      />
                      <CustomInput
                        label="Date"
                        name="date"
                        type="date"
                        editable={!viewMode}
                      />
                      <CustomInput
                        label="Supplier"
                        name="supplier_id"
                        method="switch"
                        values={supplierOptions}
                        editable={!viewMode}
                      />
                    </Grid>

                    <CustomContainer
                      title="Items"
                      size="xs"
                      filledHeader
                      smallHeader
                      rightSection={
                        <Button
                          colorScheme="purple"
                          variant="new-outline"
                          onClick={() => setFieldValue("items", [])}
                        >
                          Clear
                        </Button>
                      }
                    >
                      {values.items?.length > 0 ? (
                        <Table size="sm" variant="simple" mb={4}>
                          <Thead>
                            <Tr>
                              <Th>Item Code (product_id)</Th>
                              <Th>Rec Qty</Th>
                              <Th>MRP</Th>
                              {!viewMode && <Th w="60px" />}
                            </Tr>
                          </Thead>
                          <Tbody>
                            {values.items.map((row, idx) => (
                              <Tr key={idx}>
                                <Td>{row.product_id}</Td>
                                <Td>{row.qty}</Td>
                                <Td>{row.mrp}</Td>
                                {!viewMode && (
                                  <Td>
                                    <IconButton
                                      aria-label="Remove"
                                      size="xs"
                                      colorScheme="red"
                                      variant="ghost"
                                      icon={<i className="fa fa-trash" />}
                                      onClick={() => {
                                        const next = values.items.filter(
                                          (_, i) => i !== idx
                                        );
                                        setFieldValue("items", next);
                                      }}
                                    />
                                  </Td>
                                )}
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      ) : (
                        <Text color="gray.500" mb={4}>
                          No items. Upload a file or add manually.
                        </Text>
                      )}
                    </CustomContainer>

                    {!viewMode && (
                      <Flex gap={3} justify="flex-end" mt={6}>
                        <Button
                          type="button"
                          variant="outline"
                          colorScheme="purple"
                          onClick={() => router.push("/purchase/job-worksheet")}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" colorScheme="purple">
                          {createMode ? "Create" : "Update"}
                        </Button>
                      </Flex>
                    )}
                  </>
                )}
              </form>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default JobWorksheetMode;
