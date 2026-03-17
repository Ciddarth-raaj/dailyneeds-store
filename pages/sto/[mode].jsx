import React, { useMemo, useState, useCallback, useEffect } from "react";
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
 * Build table rows from transfer(s) using file_qty from response as quantity.
 */
function buildRowsFromTransfers(transfers, products) {
  if (!Array.isArray(transfers) || transfers.length === 0) return [];
  const rows = [];
  transfers.forEach((transfer) => {
    const toStore = transfer.Cust_Name ?? transfer.branch?.outlet_name ?? "-";
    (transfer.items || []).forEach((item) => {
      const articleId = item.Item_Code;
      const dbQty = item.Item_qty != null ? Number(item.Item_qty) : 0;
      rows.push({
        articleId,
        articleName: products[articleId]?.gf_item_name ?? item.Item_Name ?? "-",
        toStore,
        quantity: item.file_qty != null ? Number(item.file_qty) : null,
        dbQuantity: dbQty,
      });
    });
  });
  return rows;
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

  const { transfers, loading: listLoading } = useStockTransfer();
  const { transfers: transfersByRef, loading: refLoading } = useStockTransferByRefId(
    isEdit || isView ? queryId : null
  );

  const selectedTransfer = useMemo(() => {
    if (isCreate) return transfers?.find((t) => t.Dn_Ref_no == dnRefNo);
    if (transfersByRef?.length) return transfersByRef[0];
    return null;
  }, [isCreate, transfers, transfersByRef, dnRefNo]);

  const mergedTransfersForPrefill = useMemo(() => {
    if (isCreate && selectedTransfer) return [selectedTransfer];
    return transfersByRef || [];
  }, [isCreate, selectedTransfer, transfersByRef]);

  const { getMappedProducts, loading: productsLoading } = useProducts({
    limit: 50000,
    fetchAll: true,
  });
  const products = getMappedProducts();

  useEffect(() => {
    if (
      mergedTransfersForPrefill.length > 0 &&
      mergedTransfersForPrefill.some((t) => t.is_checked) &&
      products
    ) {
      const rows = buildRowsFromTransfers(mergedTransfersForPrefill, products);
      if (rows.length > 0) {
        setParsedRows((prev) => (prev.length === 0 ? rows : prev));
      }
    }
  }, [mergedTransfersForPrefill, products]);

  useEffect(() => {
    if ((isEdit || isView) && queryId != null && queryId !== "" && dnRefNo !== queryId) {
      setDnRefNo(queryId);
    }
  }, [isEdit, isView, queryId, dnRefNo]);

  const transferOptions = useMemo(() => {
    const list = isCreate ? transfers : transfersByRef;
    return (list || []).map((t) => ({
      id: t.Dn_Ref_no,
      value: String(t.Dn_Ref_no),
      ...t,
    }));
  }, [isCreate, transfers, transfersByRef]);

  const stoCustomRenderer = useCallback(
    (option) => (
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
          </Text>
        </Flex>
      </Flex>
    ),
    []
  );

  const colDefs = useMemo(
    () => [
      { field: "articleId", headerName: "Article Id", flex: 1 },
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
          if (!params.data.quantity) {
            return <Text color="gray">N/A</Text>;
          }

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

  const getDbQuantity = (articleId) => {
    const transferItem = selectedTransfer?.items?.filter(
      (item) => item.Item_Code == articleId
    );

    const totalQuantity =
      transferItem && transferItem.length > 0
        ? transferItem.reduce((acc, item) => acc + parseInt(item.Item_qty), 0)
        : 0;

    return totalQuantity;
  };

  const handleMappedData = (mappedRows) => {
    const items =
      mappedRows && mappedRows.length > 0
        ? mappedRows.map((row) => {
            const dbQuantity = getDbQuantity(row.articleId);

            return {
              articleId: row.articleId,
              articleName:
                products[row.articleId]?.gf_item_name ?? row.articleName,
              toStore: row.toStore,
              quantity: row.quantity,
              dbQuantity,
            };
          })
        : [];

    if (selectedTransfer?.items.length > items.length) {
      const filteredItems = selectedTransfer?.items.filter(
        (item) => !items.some((i) => i.articleId == item.Item_Code)
      );

      filteredItems.forEach((item) => {
        items.push({
          articleId: item.Item_Code,
          articleName:
            products[item.Item_Code]?.gf_item_name ?? item.articleName,
          toStore: selectedTransfer?.Cust_Name,
          quantity: null,
          dbQuantity: getDbQuantity(item.Item_Code),
        });
      });
    }

    setParsedRows(items);
  };

  const handleClearItems = useCallback(() => {
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
  const showFileUpload =
    isCreate &&
    hasRefSelected &&
    !hasParsedData &&
    !selectedTransfer?.is_checked;
  const showClearButton = (isCreate || isEdit) && hasParsedData;
  const showSubmitButton = isCreate || isEdit;
  const pageTitle =
    mode === "view"
      ? "View STO"
      : mode === "edit"
      ? "Edit STO"
      : "Create STO";
  const loading =
    listLoading ||
    productsLoading ||
    ((isEdit || isView) && refLoading && !transfersByRef?.length);

  const permissionKey = isView ? "view_sto" : "add_sto";

  return (
    <GlobalWrapper title={`Stock Transfer Out - ${pageTitle}`} permissionKey={permissionKey}>
      <CustomContainer title={pageTitle} filledHeader>
        {loading ? (
          <Flex py={4} justify="center">
            <Text>Loading...</Text>
          </Flex>
        ) : (
          <>
            <Grid templateColumns={{ base: "1fr", md: "1fr" }} gap={4}>
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

              {showFileUpload && (
                <Box>
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
                    showClearButton ? (
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={handleClearItems}
                      >
                        Clear
                      </Button>
                    ) : null
                  }
                >
                  <AgGrid
                    rowData={parsedRows}
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
