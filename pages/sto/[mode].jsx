import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Box, Button, Flex, Text, Grid } from "@chakra-ui/react";
import CustomInput from "../../components/customInput/customInput";
import AgGrid from "../../components/AgGrid";
import useStockTransfer from "../../customHooks/useStockTransfer";
import useStockTransferByRefId from "../../customHooks/useStockTransferByRefId";
import currencyFormatter from "../../util/currencyFormatter";
import FileUploaderWithColumnMapping from "../../components/FileUploaderWithColumnMapping";
import toast from "react-hot-toast";
import { useProducts } from "../../customHooks/useProducts";
import stoCheck from "../../helper/stoCheck";
import Badge from "../../components/Badge";
import moment from "moment";

const COLUMN_MAPPING_CONFIG = [
  {
    key: "articleId",
    label: "Article Id",
    required: true,
    suggestedKey: "Article Id",
    type: "string",
  },
  {
    key: "articleName",
    label: "Article Name",
    required: true,
    suggestedKey: "Article Name",
    type: "string",
  },
  {
    key: "toStore",
    label: "To Store",
    required: true,
    suggestedKey: "To Store",
    type: "string",
  },
  {
    key: "quantity",
    label: "Quantity",
    required: true,
    suggestedKey: "Quantity",
    type: "number",
  },
];

/**
 * Build table rows from transfer(s): dbQuantity from items, quantity from file_items.
 * Same row shape as create (handleMappedData) so upload and view/edit show identical values.
 */
function buildRowsFromTransfers(transfers) {
  if (!Array.isArray(transfers) || transfers.length === 0) return [];

  const byArticleId = {};
  transfers.forEach((transfer) => {
    const toStore = transfer.Cust_Name ?? transfer.branch?.outlet_name ?? "-";
    // dbQuantity from items (Item_Code, Item_qty)
    (transfer.items || []).forEach((item) => {
      const articleId = item.Item_Code;
      const dbQty = item.Item_qty != null ? Number(item.Item_qty) : null;
      if (byArticleId[articleId]) {
        byArticleId[articleId].dbQuantity += dbQty;
      } else {
        byArticleId[articleId] = {
          articleId,
          articleName: item.Item_Name ?? "-",
          toStore,
          quantity: null,
          dbQuantity: dbQty,
        };
      }
    });

    // quantity (file_qty) from file_items (product_id, file_qty)
    (transfer.file_items || []).forEach((fi) => {
      const articleId = fi.product_id;
      const fileQty = fi.file_qty != null ? Number(fi.file_qty) : null;
      if (byArticleId[articleId]) {
        const prev = byArticleId[articleId].quantity;
        byArticleId[articleId].quantity =
          prev != null && fileQty != null ? prev + fileQty : prev ?? fileQty;
      } else {
        byArticleId[articleId] = {
          articleId,
          articleName: fi?.gf_item_name ?? fi?.de_display_name ?? "-",
          toStore,
          quantity: fileQty,
          dbQuantity: null,
        };
      }
    });
  });

  return Object.values(byArticleId);
}

function STOForm({ mode }) {
  const router = useRouter();
  const { id: queryId } = router.query;
  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [dnRefNo, setDnRefNo] = useState(isCreate ? null : queryId ?? null);
  const [parsedRows, setParsedRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const userHasClearedRef = useRef(false);

  const { transfers, loading: listLoading } = useStockTransfer();
  const { transfers: transfersByRef, loading: refLoading } =
    useStockTransferByRefId(isEdit || isView ? queryId : null);

  const selectedTransfer = useMemo(() => {
    if (isCreate) return transfers?.find((t) => t.Dn_Ref_no == dnRefNo);
    if (transfersByRef?.length) return transfersByRef[0];
    return null;
  }, [isCreate, transfers, transfersByRef, dnRefNo]);

  const mergedTransfersForPrefill = useMemo(() => {
    if (isCreate && selectedTransfer) return [selectedTransfer];
    return transfersByRef || [];
  }, [isCreate, selectedTransfer, transfersByRef]);

  const {
    products: productsList,
    getMappedProducts,
    loading: productsLoading,
  } = useProducts({
    limit: 50000,
    fetchAll: true,
  });
  const products = getMappedProducts();

  /** Edit/View: prefill table from API. Create: no prefill — user must pick ref, then upload file, then table appears. */
  useEffect(() => {
    if (isCreate) return;
    if (userHasClearedRef.current) return;
    if (mergedTransfersForPrefill.length > 0) {
      const rows = buildRowsFromTransfers(mergedTransfersForPrefill);
      if (rows.length > 0) {
        setParsedRows((prev) => (prev.length === 0 ? [...rows] : prev));
      }
    }
  }, [mergedTransfersForPrefill, isCreate]);

  useEffect(() => {
    userHasClearedRef.current = false;
  }, [queryId, dnRefNo]);

  /** Create page: /sto/create?id=<Dn_Ref_no> pre-selects the transfer */
  useEffect(() => {
    if (!isCreate || !router.isReady) return;
    const id = router.query.id;
    if (id == null || id === "") return;
    setDnRefNo(String(id));
  }, [isCreate, router.isReady, router.query.id]);

  useEffect(() => {
    if (
      (isEdit || isView) &&
      queryId != null &&
      queryId !== "" &&
      dnRefNo !== queryId
    ) {
      setDnRefNo(queryId);
    }
  }, [isEdit, isView, queryId, dnRefNo]);

  const transferOptions = useMemo(() => {
    const list = isCreate
      ? transfers.filter((item) => (item.file_items || []).length === 0)
      : transfersByRef;
    return (list || []).map((t) => ({
      id: t.Dn_Ref_no,
      value: String(t.Dn_Ref_no),
      ...t,
    }));
  }, [isCreate, transfers, transfersByRef]);

  const stoCustomRenderer = useCallback((option) => {
    return (
      <Flex align="center" gap={3} py={1}>
        <Flex direction="column" minW={0} flex={1}>
          <Text fontSize="sm" fontWeight={500} noOfLines={1}>
            {option.Dn_Ref_no ?? option.value}
          </Text>

          <Text fontSize="xs" color="gray.500">
            {option.Cust_Name} | {currencyFormatter(option.Dn_Amt)} |{" "}
            <Text as="span" color="purple.500">
              {option.Tot_Items} item{option.Tot_Items > 1 ? "s" : ""}
            </Text>
            {" | "}
            <Text as="span" color="orange.500">
              {moment(option.DN_date).format("DD/MM/YYYY")}
            </Text>
          </Text>
        </Flex>
      </Flex>
    );
  }, []);

  const colDefs = useMemo(
    () => [
      {
        field: "articleId",
        headerName: "ID",
        type: "id",
        valueGetter: (params) => Number(params.data.articleId),
      },
      { field: "articleName", headerName: "Article Name", flex: 2 },
      { field: "toStore", headerName: "To Store", flex: 1 },
      { field: "quantity", headerName: "File Quantity", flex: 1 },
      { field: "dbQuantity", headerName: "DB Quantity", flex: 1 },
      {
        field: "difference",
        headerName: "Difference",
        flex: 1,
        valueGetter: (params) => {
          return params.data.dbQuantity - params.data.quantity;
        },
        cellRenderer: (params) => {
          if (params.value == 0) {
            return "-";
          }

          return (
            <Text color={params.value > 0 ? "green" : "red"}>
              {params.value}
            </Text>
          );
        },
      },
    ],
    []
  );

  const getDbQuantity = useCallback(
    (articleId) => {
      let total = 0;
      (mergedTransfersForPrefill || []).forEach((t) => {
        (t.items || []).forEach((item) => {
          if (item.Item_Code == articleId) {
            total += item.Item_qty != null ? Number(item.Item_qty) : 0;
          }
        });
      });
      return total === 0 ? null : total;
    },
    [mergedTransfersForPrefill]
  );

  const handleMappedData = useCallback(
    (mappedRows) => {
      const fromFile =
        mappedRows && mappedRows.length > 0
          ? mappedRows
              .filter(
                (row) => row.quantity != null && Number(row.quantity) !== 0
              )
              .map((row) => ({
                articleId: row.articleId,
                articleName:
                  products[row.articleId]?.gf_item_name ??
                  products[row.articleId]?.de_display_name ??
                  row.articleName,
                toStore: row.toStore,
                quantity: row.quantity != null ? Number(row.quantity) : null,
                dbQuantity: getDbQuantity(row.articleId),
              }))
          : [];

      const fileArticleIds = new Set(fromFile.map((r) => String(r.articleId)));
      const toStore =
        mergedTransfersForPrefill?.[0]?.Cust_Name ??
        mergedTransfersForPrefill?.[0]?.branch?.outlet_name ??
        "-";

      (mergedTransfersForPrefill || []).forEach((transfer) => {
        (transfer.items || []).forEach((item) => {
          const articleId = item.Item_Code;
          if (fileArticleIds.has(String(articleId))) return;
          fileArticleIds.add(String(articleId));
          fromFile.push({
            articleId,
            articleName:
              products[articleId]?.gf_item_name ??
              products[articleId]?.de_display_name ??
              item.Item_Name ??
              "-",
            toStore,
            quantity: null,
            dbQuantity: getDbQuantity(articleId),
          });
        });
      });

      setParsedRows(fromFile);
    },
    [mergedTransfersForPrefill, products, getDbQuantity]
  );

  const handleClearItems = useCallback(() => {
    userHasClearedRef.current = true;
    setParsedRows([]);
  }, []);

  const hasRefSelected = dnRefNo != null && dnRefNo !== "";
  const hasParsedData = parsedRows.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!hasRefSelected || !hasParsedData) return;
    setSubmitting(true);
    try {
      const items = parsedRows.map((row) => ({
        product_id: Number(row.articleId),
        file_qty: row.quantity != null ? Number(row.quantity) : null,
      }));
      await stoCheck.bulkReplace([{ dn_ref_no: Number(dnRefNo), items }]);
      toast.success("STO check saved");
      router.push("/sto");
    } catch (err) {
      toast.error(err?.message ?? "Failed to save STO check");
    } finally {
      setSubmitting(false);
    }
  }, [dnRefNo, parsedRows, hasRefSelected, hasParsedData, router]);

  const handleCancel = useCallback(() => {
    router.push("/sto");
  }, [router]);

  const refDisabled = isEdit || isView;
  /** Create: ref → upload file → table. Edit: same when rows cleared. */
  const showFileUpload =
    hasRefSelected && !hasParsedData && (isCreate || isEdit);
  const showClearButton = (isCreate || isEdit) && hasParsedData;
  const showSubmitButton = isCreate || isEdit;
  const pageTitle =
    mode === "view" ? "View STO" : mode === "edit" ? "Edit STO" : "Create STO";
  const loading =
    listLoading ||
    productsLoading ||
    ((isEdit || isView) && refLoading && !transfersByRef?.length);

  const permissionKey = isView ? "view_sto" : "add_sto";

  const getTotals = (totalKey) => {
    return parsedRows.reduce((acc, row) => {
      return acc + (row[totalKey] != null ? Number(row[totalKey]) : 0);
    }, 0);
  };

  const sortedParsedRows = useMemo(() => {
    return [...parsedRows].sort((a, b) => {
      const diffA = (a.dbQuantity ?? 0) - (a.quantity ?? 0);
      const diffB = (b.dbQuantity ?? 0) - (b.quantity ?? 0);
      const hasDiffA = diffA != null && Number(diffA) !== 0;
      const hasDiffB = diffB != null && Number(diffB) !== 0;

      if (hasDiffA && !hasDiffB) return -1;
      if (!hasDiffA && hasDiffB) return 1;
      return 0;
    });
  }, [parsedRows]);

  return (
    <GlobalWrapper
      title={`Stock Transfer Out - ${pageTitle}`}
      permissionKey={permissionKey}
    >
      <CustomContainer title={pageTitle} filledHeader>
        {loading ? (
          <Flex py={4} justify="center">
            <Text>Loading...</Text>
          </Flex>
        ) : (
          <>
            <Grid templateColumns="1fr" gap={4}>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <CustomInput
                  label="DN Ref No"
                  value={dnRefNo}
                  onChange={(value) => {
                    if (!refDisabled) {
                      setDnRefNo(value);
                      setParsedRows([]);
                    }
                  }}
                  method="searchable-dropdown"
                  values={transferOptions}
                  placeholder="Select ref no"
                  customRenderer={stoCustomRenderer}
                  editable={!listLoading && !refDisabled}
                />
                {!isCreate && (
                  <CustomInput
                    label="DN Date"
                    value={
                      selectedTransfer?.DN_date
                        ? moment(selectedTransfer.DN_date).format("DD/MM/YYYY")
                        : ""
                    }
                    method="datepicker"
                    type="date"
                    editable={false}
                  />
                )}
              </Grid>

              {showFileUpload && (
                <Box>
                  {isCreate ? (
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Upload a file and map columns — the items table will appear
                      here next.
                    </Text>
                  ) : null}
                  <Text fontSize="sm" fontWeight={500} mb={2} color="gray.700">
                    Upload file (CSV or XLSX) and map columns
                  </Text>
                  <FileUploaderWithColumnMapping
                    config={COLUMN_MAPPING_CONFIG}
                    onMappedData={handleMappedData}
                    accept=".xlsx,.xls,.csv"
                  />
                </Box>
              )}

              {hasParsedData && (
                <CustomContainer
                  title="Items"
                  smallHeader
                  filledHeader
                  size="xs"
                  rightSection={
                    <Flex gap={2} align="center">
                      <Badge colorScheme="orange">
                        File Qty : {getTotals("quantity")}
                      </Badge>
                      <Badge colorScheme="orange">
                        DB Qty : {getTotals("dbQuantity")}
                      </Badge>

                      <Badge colorScheme="orange">
                        Difference :{" "}
                        {getTotals("quantity") - getTotals("dbQuantity")}
                      </Badge>

                      {showClearButton ? (
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          onClick={handleClearItems}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </Flex>
                  }
                >
                  <AgGrid
                    rowData={sortedParsedRows}
                    columnDefs={colDefs}
                    tableKey={`sto-${mode}-items`}
                  />
                </CustomContainer>
              )}
            </Grid>

            <Flex gap={2} mt={4} justify="flex-end">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                {isView ? "Back to list" : "Cancel"}
              </Button>
              {showSubmitButton && (
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={handleSubmit}
                  isDisabled={!hasRefSelected || !hasParsedData}
                  isLoading={submitting}
                  loadingText="Saving..."
                >
                  Submit
                </Button>
              )}
            </Flex>
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

const VALID_MODES = ["create", "view", "edit"];

function STOModePage() {
  const router = useRouter();
  const { mode } = router.query;

  if (router.isReady && mode != null && !VALID_MODES.includes(mode)) {
    return (
      <GlobalWrapper title="Stock Transfer Out" permissionKey="view_sto">
        <CustomContainer title="Invalid mode" filledHeader>
          <Text py={4}>Mode must be create, view, or edit.</Text>
          <Button
            size="sm"
            colorScheme="purple"
            onClick={() => router.push("/sto")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (mode != null && VALID_MODES.includes(mode)) {
    return <STOForm mode={mode} />;
  }

  return (
    <GlobalWrapper title="Stock Transfer Out" permissionKey="view_sto">
      <CustomContainer title="Loading..." filledHeader>
        <Flex py={4} justify="center">
          <Text>Loading...</Text>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default STOModePage;
