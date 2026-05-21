import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import currencyFormatter from "../../util/currencyFormatter";
import { buildAutoMatchPreviewRows } from "../../util/gstr2aPurchaseRegister";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const MATCH_COLOR = "var(--chakra-colors-green-600)";
const MISMATCH_COLOR = "var(--chakra-colors-red-600)";

function CompareCell({ match, children }) {
  return (
    <Flex align="center" h="100%">
      <span
        style={{
          color: match ? MATCH_COLOR : MISMATCH_COLOR,
          fontWeight: 600,
        }}
      >
        {children}
      </span>
    </Flex>
  );
}

function formatText(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

function formatCurrency(value) {
  if (value === undefined || value === null) return "—";
  return currencyFormatter(value);
}

function compareColPair(flagKey, field2A, fieldPr, formatPr, format2A) {
  const fmt2A = format2A ?? formatPr ?? formatText;
  const fmtPr = formatPr ?? format2A ?? formatText;

  return [
    {
      field: field2A,
      headerName: "2A",
      sortable: false,
      minWidth: 120,
      cellRenderer: (params) => {
        const match = params.data?._compareFlags?.[flagKey];
        return (
          <CompareCell match={match}>{fmt2A(params.value)}</CompareCell>
        );
      },
    },
    {
      field: fieldPr,
      headerName: "PR",
      sortable: false,
      minWidth: 120,
      cellRenderer: (params) => {
        const match = params.data?._compareFlags?.[flagKey];
        return (
          <CompareCell match={match}>{fmtPr(params.value)}</CompareCell>
        );
      },
    },
  ];
}

function buildMatchedColumnDefs() {
  return [
    {
      headerName: "Document Number",
      children: compareColPair("invoice", "docNo2A", "docNoPr"),
    },
    {
      headerName: "Document Date",
      children: compareColPair("date", "docDate2A", "docDatePr"),
    },
    {
      headerName: "Taxable Value",
      children: compareColPair(
        "taxable",
        "taxable2A",
        "taxablePr",
        formatCurrency,
        formatCurrency
      ),
    },
    {
      headerName: "IGST",
      children: compareColPair(
        "igst",
        "igst2A",
        "igstPr",
        formatCurrency,
        formatCurrency
      ),
    },
    {
      headerName: "CGST",
      children: compareColPair(
        "cgst",
        "cgst2A",
        "cgstPr",
        formatCurrency,
        formatCurrency
      ),
    },
    {
      headerName: "SGST",
      children: compareColPair(
        "sgst",
        "sgst2A",
        "sgstPr",
        formatCurrency,
        formatCurrency
      ),
    },
    {
      headerName: "Total Tax Value",
      children: compareColPair(
        "totalTax",
        "totalTax2A",
        "totalTaxPr",
        formatCurrency,
        formatCurrency
      ),
    },
    {
      headerName: "Total Value",
      children: compareColPair(
        "totalValue",
        "totalValue2A",
        "totalValuePr",
        formatCurrency,
        formatCurrency
      ),
    },
  ];
}

const UNMATCHED_COLUMN_DEFS = [
  {
    field: "docNo2A",
    headerName: "Document No.",
    pinned: "left",
    lockPosition: true,
    width: 140,
    flex: 0,
    sortable: false,
  },
  {
    field: "docDate2A",
    headerName: "Document Date",
    sortable: false,
    minWidth: 118,
  },
  {
    field: "taxable2A",
    headerName: "Taxable Value",
    type: "currency",
    sortable: false,
    minWidth: 110,
  },
  {
    field: "igst2A",
    headerName: "IGST",
    type: "currency",
    sortable: false,
    minWidth: 100,
  },
  {
    field: "cgst2A",
    headerName: "CGST",
    type: "currency",
    sortable: false,
    minWidth: 100,
  },
  {
    field: "sgst2A",
    headerName: "SGST",
    type: "currency",
    sortable: false,
    minWidth: 100,
  },
  {
    field: "totalTax2A",
    headerName: "Total Tax",
    type: "currency",
    sortable: false,
    minWidth: 110,
  },
  {
    field: "totalValue2A",
    headerName: "Total Value",
    type: "currency",
    sortable: false,
    minWidth: 110,
  },
];

export default function Gstr2aAutoMatchPreviewModal({
  isOpen,
  onClose,
  pairs = [],
  unmatchedDocuments = [],
  confirming = false,
  onConfirm,
}) {
  const { colorScheme: cs } = useModuleTableTheme();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTabIndex(0);
      return;
    }
    setTabIndex(
      pairs.length === 0 && unmatchedDocuments.length > 0 ? 1 : 0
    );
  }, [isOpen, pairs.length, unmatchedDocuments.length]);

  const previewRows = useMemo(
    () => buildAutoMatchPreviewRows(pairs),
    [pairs]
  );

  const matchedColumnDefs = useMemo(() => buildMatchedColumnDefs(), []);

  const footer = (
    <Flex justify="flex-end" gap={3} w="100%">
      <Button variant="ghost" onClick={onClose} isDisabled={confirming}>
        Cancel
      </Button>
      <Button
        colorScheme={cs}
        onClick={onConfirm}
        isLoading={confirming}
        isDisabled={!pairs.length}
      >
        Confirm match ({pairs.length})
      </Button>
    </Flex>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto match preview"
      size="6xl"
      scrollBehavior="inside"
      bodyProps={{ p: "24px" }}
      footer={footer}
    >
      <Text fontSize="sm" color="gray.600" mb={4}>
        Review proposed matches before saving. Green fields match between 2A and
        PR; red fields differ. Confirm will save {pairs.length} proposed match
        {pairs.length === 1 ? "" : "es"}.
      </Text>
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        colorScheme={cs}
        variant="enclosed"
      >
        <TabList>
          <Tab fontSize="sm">Proposed ({previewRows.length})</Tab>
          <Tab fontSize="sm">Unmatched ({unmatchedDocuments.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={4}>
            {previewRows.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                No documents matched the auto-match rules.
              </Text>
            ) : (
              <AgGrid
                rowData={previewRows}
                columnDefs={matchedColumnDefs}
                tableKey="gst-gstr2a-auto-match-preview-matched"
                tableColorScheme={cs}
                getRowId={(params) => String(params.data?._rowId ?? "")}
              />
            )}
          </TabPanel>
          <TabPanel px={0} pt={4}>
            {unmatchedDocuments.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                All unmatched documents have a proposed auto-match.
              </Text>
            ) : (
              <AgGrid
                rowData={unmatchedDocuments}
                columnDefs={UNMATCHED_COLUMN_DEFS}
                tableKey="gst-gstr2a-auto-match-preview-unmatched"
                tableColorScheme={cs}
                getRowId={(params) => String(params.data?._rowId ?? "")}
              />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </CustomModal>
  );
}
