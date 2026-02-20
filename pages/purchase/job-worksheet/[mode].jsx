import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { CustomInputStandalone } from "../../../components/customInput/customInput";
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
  Image,
} from "@chakra-ui/react";
import Badge from "../../../components/Badge";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { useJobWorksheetById } from "../../../customHooks/useJobWorksheetById";
import { useProducts } from "../../../customHooks/useProducts";
import { useProductSuppliers } from "../../../customHooks/useProductSuppliers";
import { useStickerTypes } from "../../../customHooks/useStickerTypes";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import {
  createJobWorksheet,
  updateJobWorksheet,
} from "../../../helper/jobWorksheet";

const MATERIAL_TYPES = [
  { id: "Single", value: "Single" },
  { id: "Double", value: "Double" },
  { id: "Looping", value: "Looping" },
];

const STATUS_OPTIONS = [
  { id: "open", value: "Open" },
  { id: "done", value: "Done" },
];

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
  supplier_id: Yup.string().required("Supplier is required").trim().nullable(),
  items: Yup.array().of(
    Yup.object({
      product_id: Yup.number().required("Product is required").nullable(),
      qty: Yup.number().min(0, "Qty must be ≥ 0").required("Qty is required"),
      mrp: Yup.number().min(0, "MRP must be ≥ 0").required("MRP is required"),
      material_type: Yup.string().nullable(),
      sticker_type_1: Yup.number().nullable(),
      sticker_type_2: Yup.number().nullable(),
      status: Yup.string().oneOf(["open", "done"]).nullable(),
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
  const { products } = useProducts({ limit: 10000, fetchAll: true });
  const { supplierOptions } = useProductSuppliers();
  const { stickerTypes } = useStickerTypes({ limit: 500 });

  const productMap = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const imageUrl = p.image_url;
      map[p.product_id] = {
        gf_item_name: p.gf_item_name ?? p.de_display_name ?? "-",
        imageUrl,
        store_uom: p.store_uom ?? "-",
        purchase_uom: p.purchase_uom ?? "-",
        repln_mode: p.repln_mode ?? "-",
      };
    });
    return map;
  }, [products]);

  const stickerOptions = useMemo(
    () =>
      (stickerTypes || []).map((s) => ({
        id: s.sticker_id,
        value: s.label,
      })),
    [stickerTypes]
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
          material_type: it.material_type ?? "Single",
          sticker_type_1: it.sticker_type_1 ?? it.sticker_type_id ?? null,
          sticker_type_2: it.sticker_type_2 ?? null,
          status: it.status ?? "open",
        })),
      });
    }
  }, [createMode, worksheet]);

  const handleMappedItems = (setFieldValue) => (mappedRows) => {
    const valid = mappedRows
      .filter(
        (r) =>
          r.product_id != null &&
          r.qty != null &&
          r.mrp != null &&
          Number(r.qty) >= 0 &&
          Number(r.mrp) >= 0
      )
      .map((r) => ({
        ...r,
        material_type: r.material_type ?? "Single",
        sticker_type_1: r.sticker_type_1 ?? null,
        sticker_type_2: r.sticker_type_2 ?? null,
        status: r.status ?? "open",
      }));
    setFieldValue("items", valid);
    toast.success(`Imported ${valid.length} item(s)`);
  };

  const handleSubmit = async (values) => {
    const payload = {
      grn_no: values.grn_no.trim(),
      date: values.date,
      supplier_id: values.supplier_id?.trim() ?? "",
      items: values.items.map((it) => ({
        product_id: parseInt(it.product_id, 10),
        qty: parseInt(Number(it.qty), 10),
        mrp: Number(it.mrp),
        material_type: it.material_type ?? "Single",
        sticker_type_1: it.sticker_type_1 ?? null,
        sticker_type_2: it.sticker_type_2 ?? null,
        status: it.status ?? "open",
      })),
    };

    if (createMode) {
      try {
        const res = await createJobWorksheet(payload);
        if (res?.id) {
          toast.success("Job worksheet created");
          router.push(`/purchase/job-worksheet`);
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

  const getPermissionKey = () => {
    if (viewMode) return "view_job_worksheet";
    return "add_job_worksheet";
  };

  return (
    <GlobalWrapper title={title} permissionKey={getPermissionKey()}>
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
                      skipHeaders={2}
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
                      title="Products"
                      size="xs"
                      filledHeader
                      smallHeader
                      rightSection={
                        viewMode ? null : (
                          <Button
                            colorScheme="purple"
                            variant="new-outline"
                            onClick={() => setFieldValue("items", [])}
                          >
                            Clear
                          </Button>
                        )
                      }
                    >
                      {values.items?.length > 0 ? (
                        <Table size="sm" variant="striped" mb={4}>
                          <Thead>
                            <Tr>
                              <Th>ID</Th>
                              <Th>Image</Th>
                              <Th>Name</Th>
                              <Th>Store UOM</Th>
                              <Th>Purchase UOM</Th>
                              <Th>SKU Type</Th>
                              <Th w="150px">Material Type</Th>
                              <Th w="150px">Sticker Type</Th>
                              <Th w="100px">Qty</Th>
                              <Th>MRP</Th>
                              {!createMode && <Th>Status</Th>}
                              {!viewMode && <Th w="60px" />}
                            </Tr>
                          </Thead>
                          <Tbody>
                            {values.items.map((row, idx) => {
                              const productInfo =
                                productMap[row.product_id] || {};
                              const isRowDone = row.status === "done";
                              const canEdit = !viewMode && !isRowDone;

                              const isSingle =
                                (row.material_type || "Single") === "Single";
                              const updateItem = (field, val) => {
                                const next = values.items.map((item, i) =>
                                  i === idx ? { ...item, [field]: val } : item
                                );
                                setFieldValue("items", next);
                              };
                              return (
                                <Tr key={idx}>
                                  <Td>
                                    <Text fontSize="sm">{row.product_id}</Text>
                                  </Td>
                                  <Td>
                                    {productInfo.imageUrl ? (
                                      <Image
                                        src={productInfo.imageUrl}
                                        alt=""
                                        boxSize="20"
                                        objectFit="cover"
                                        borderRadius="md"
                                      />
                                    ) : (
                                      <Box
                                        boxSize="20"
                                        bg="gray.100"
                                        borderRadius="md"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                      >
                                        <Text
                                          fontSize="smaller"
                                          color="gray.400"
                                        >
                                          No Image
                                        </Text>
                                      </Box>
                                    )}
                                  </Td>
                                  <Td>
                                    <Text fontSize="xs" lineHeight="1.4">
                                      {productInfo.gf_item_name ?? "-"}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm">
                                      {productInfo.store_uom ?? "-"}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm">
                                      {productInfo.purchase_uom ?? "-"}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Badge
                                      colorScheme={
                                        productInfo.repln_mode === "pa"
                                          ? "purple"
                                          : productInfo.repln_mode === "ft"
                                          ? "orange"
                                          : "gray"
                                      }
                                      size="xs"
                                    >
                                      {productInfo.repln_mode === "pa"
                                        ? "PA"
                                        : productInfo.repln_mode === "ft"
                                        ? "FT"
                                        : productInfo.repln_mode ?? "-"}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    <CustomInputStandalone
                                      label=""
                                      value={row.material_type ?? "Single"}
                                      onChange={(v) =>
                                        updateItem("material_type", v)
                                      }
                                      method="switch"
                                      values={MATERIAL_TYPES}
                                      editable={canEdit}
                                      size="sm"
                                    />
                                  </Td>
                                  <Td>
                                    {isSingle ? (
                                      <CustomInputStandalone
                                        label=""
                                        value={row.sticker_type_1 ?? ""}
                                        onChange={(v) =>
                                          updateItem(
                                            "sticker_type_1",
                                            v ? Number(v) : null
                                          )
                                        }
                                        method="switch"
                                        values={stickerOptions}
                                        editable={canEdit}
                                        size="sm"
                                        placeholder="Select"
                                      />
                                    ) : (
                                      <Flex direction="column" gap={2}>
                                        <CustomInputStandalone
                                          label=""
                                          value={row.sticker_type_1 ?? ""}
                                          onChange={(v) =>
                                            updateItem(
                                              "sticker_type_1",
                                              v ? Number(v) : null
                                            )
                                          }
                                          method="switch"
                                          values={stickerOptions}
                                          editable={canEdit}
                                          size="sm"
                                          placeholder="Select"
                                        />
                                        <CustomInputStandalone
                                          label=""
                                          value={row.sticker_type_2 ?? ""}
                                          onChange={(v) =>
                                            updateItem(
                                              "sticker_type_2",
                                              v ? Number(v) : null
                                            )
                                          }
                                          method="switch"
                                          values={stickerOptions}
                                          editable={canEdit}
                                          size="sm"
                                          placeholder="Select"
                                        />
                                      </Flex>
                                    )}
                                  </Td>
                                  <Td>
                                    <CustomInputStandalone
                                      label=""
                                      type="number"
                                      value={row.qty}
                                      onChange={(v) => updateItem("qty", v)}
                                      editable={canEdit}
                                      size="sm"
                                    />
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm">{row.mrp}</Text>
                                  </Td>
                                  {!createMode && (
                                    <Td>
                                      <Badge
                                        colorScheme={
                                          (row.status ?? "open") === "done"
                                            ? "green"
                                            : "blue"
                                        }
                                      >
                                        {(row.status ?? "open") === "done"
                                          ? "Done"
                                          : "Open"}
                                      </Badge>
                                    </Td>
                                  )}
                                  {!viewMode && (
                                    <Td>
                                      {!isRowDone && (
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
                                      )}
                                    </Td>
                                  )}
                                </Tr>
                              );
                            })}
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
