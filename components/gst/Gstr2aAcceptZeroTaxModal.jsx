import React, { useMemo } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const COLUMN_DEFS = [
  {
    field: "supplierName",
    headerName: "Supplier",
    type: "capitalized",
    pinned: "left",
    lockPosition: true,
    width: 200,
    flex: 0,
    sortable: false,
  },
  {
    field: "ctin",
    headerName: "GSTIN",
    width: 155,
    flex: 0,
    sortable: false,
  },
  {
    field: "docNoPr",
    headerName: "Bill No.",
    minWidth: 130,
    sortable: false,
  },
  {
    field: "docDatePr",
    headerName: "Bill Date",
    minWidth: 118,
    sortable: false,
  },
  {
    field: "taxablePr",
    headerName: "Taxable Value",
    type: "currency",
    minWidth: 120,
    sortable: false,
  },
  {
    field: "totalValuePr",
    headerName: "Total Value",
    type: "currency",
    minWidth: 120,
    sortable: false,
  },
];

/**
 * What "Accept zero-tax" is about to take, listed before it happens.
 *
 * Accepting records that these bills are never going to appear in GSTR-2A, so
 * the reviewer should see which bills that is - a count alone does not say
 * whether the right ones are in the set.
 */
export default function Gstr2aAcceptZeroTaxModal({
  isOpen,
  onClose,
  rows = [],
  confirming = false,
  onConfirm,
}) {
  const { colorScheme: cs } = useModuleTableTheme();

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => sum + (Number(r?.totalValuePr) || 0), 0),
    [rows]
  );

  const footer = (
    <Flex justify="space-between" align="center" w="100%" gap={3}>
      <Text fontSize="sm" color="gray.600">
        {rows.length} bill{rows.length === 1 ? "" : "s"}
        {total
          ? ` · ${total.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}`
          : ""}
      </Text>
      <Flex gap={3}>
        <Button variant="ghost" onClick={onClose} isDisabled={confirming}>
          Cancel
        </Button>
        <Button
          colorScheme="green"
          onClick={onConfirm}
          isLoading={confirming}
          isDisabled={!rows.length}
        >
          Accept {rows.length}
        </Button>
      </Flex>
    </Flex>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Accept as not in GSTR-2A"
      size="5xl"
      scrollBehavior="inside"
      bodyProps={{ p: "24px" }}
      footer={footer}
    >
      <Text fontSize="sm" color="gray.600" mb={4}>
        These bills carry no tax, so their suppliers file nothing against them
        in GSTR-2A and no document will ever arrive to match. Accepting records
        that as expected - they stay in the list badged Accepted, and each one
        can be undone from its own row.
      </Text>
      {rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          Nothing to accept.
        </Text>
      ) : (
        <AgGrid
          rowData={rows}
          columnDefs={COLUMN_DEFS}
          tableKey="gst-gstr2a-accept-zero-tax"
          tableColorScheme={cs}
          getRowId={(params) => String(params.data?._rowId ?? "")}
        />
      )}
    </CustomModal>
  );
}
