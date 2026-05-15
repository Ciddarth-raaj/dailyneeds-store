import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../../components/CustomContainer";
import AgGrid from "../../../../components/AgGrid";
import GstModuleWrapper from "../../../../components/gst/GstModuleWrapper";
import { getGstB2bInvoices } from "../../../../helper/gstB2bInvoices";

function parseDecimal(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function lineTaxSum(it) {
  return (
    parseDecimal(it?.iamt) +
    parseDecimal(it?.camt) +
    parseDecimal(it?.samt) +
    parseDecimal(it?.csamt) +
    parseDecimal(it?.cesamt)
  );
}

function vendorKey(inv) {
  const c = (inv.ctin || "").trim();
  if (c) return c;
  const vid = inv.gst_vendor_id;
  return vid != null ? `__vid_${vid}` : "__unknown";
}

function aggregateVendors(invoices) {
  const by = new Map();
  for (const inv of invoices) {
    const key = vendorKey(inv);
    if (!by.has(key)) {
      by.set(key, {
        _rowId: key,
        ctin: (inv.ctin || "").trim() || "—",
        vendorName: inv.vendor_name || "—",
        totalTax2A: 0,
        totalTaxPr: null,
        docCount2A: 0,
        docCountPr: null,
        taxable2A: 0,
        taxablePr: null,
      });
    }
    const row = by.get(key);
    if (inv.vendor_name) row.vendorName = inv.vendor_name;
    if ((inv.ctin || "").trim()) row.ctin = (inv.ctin || "").trim();

    const items = Array.isArray(inv.items) ? inv.items : [];
    for (const it of items) {
      row.taxable2A += parseDecimal(it.txval);
      row.totalTax2A += lineTaxSum(it);
    }
    row.docCount2A += 1;
  }
  return Array.from(by.values()).sort((a, b) =>
    String(a.vendorName || "").localeCompare(
      String(b.vendorName || ""),
      undefined,
      {
        sensitivity: "base",
      }
    )
  );
}

function buildDocumentRows(invoices) {
  return invoices.map((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    let taxable2A = 0;
    let igst2A = 0;
    let cgst2A = 0;
    let sgst2A = 0;
    let totalTax2A = 0;
    for (const it of items) {
      taxable2A += parseDecimal(it.txval);
      igst2A += parseDecimal(it.iamt);
      cgst2A += parseDecimal(it.camt);
      sgst2A += parseDecimal(it.samt);
      totalTax2A += lineTaxSum(it);
    }
    const declaredVal = parseDecimal(inv.val);
    const totalValue2A = declaredVal > 0 ? declaredVal : taxable2A + totalTax2A;
    const id =
      inv.gst_b2b_invoice_id != null
        ? String(inv.gst_b2b_invoice_id)
        : `${vendorKey(inv)}|${inv.inum}|${inv.idt}`;
    return {
      _rowId: id,
      supplierName: inv.vendor_name || "—",
      ctin: (inv.ctin || "").trim() || "—",
      docNo2A: inv.inum || "—",
      docNoPr: null,
      docDate2A: inv.idt || "—",
      docDatePr: null,
      taxable2A,
      taxablePr: null,
      igst2A,
      igstPr: null,
      cgst2A,
      cgstPr: null,
      sgst2A,
      sgstPr: null,
      totalTax2A,
      totalTaxPr: null,
      totalValue2A,
      totalValuePr: null,
    };
  });
}

export default function GstGstr2aPurchaseRegisterPage() {
  const [period, setPeriod] = useState(() => moment().format("YYYY-MM"));
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [filterCtin, setFilterCtin] = useState(null);
  /** When true, next switch to Document tab came from vendor GSTIN link — do not clear filter. */
  const documentTabFromGstinLinkRef = useRef(false);

  const { year, month } = useMemo(() => {
    const m = moment(period, "YYYY-MM", true);
    if (!m.isValid()) {
      return { year: moment().year(), month: moment().month() + 1 };
    }
    return { year: m.year(), month: m.month() + 1 };
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await getGstB2bInvoices(year, month);
      setInvoices(data);
      setMeta(m);
    } catch (e) {
      setInvoices([]);
      setMeta(null);
      setError(e?.message || "Failed to load GSTR-2A B2B invoices");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFilterCtin(null);
  }, [period]);

  const onGstinNavigate = useCallback((ctin) => {
    const c = (ctin || "").trim();
    if (!c || c === "—") return;
    documentTabFromGstinLinkRef.current = true;
    setFilterCtin(c);
    setTabIndex(1);
  }, []);

  const handleTabChange = useCallback((index) => {
    if (index === 1 && !documentTabFromGstinLinkRef.current) {
      setFilterCtin(null);
    }
    documentTabFromGstinLinkRef.current = false;
    setTabIndex(index);
  }, []);

  const vendorRows = useMemo(() => aggregateVendors(invoices), [invoices]);

  const documentRows = useMemo(() => {
    const rows = buildDocumentRows(invoices);
    const f = (filterCtin || "").trim();
    if (!f) return rows;
    return rows.filter((r) => (r.ctin || "").trim() === f);
  }, [invoices, filterCtin]);

  const vendorColDefs = useMemo(
    () => [
      {
        headerName: "Supplier Details",
        children: [
          {
            field: "ctin",
            headerName: "GSTIN",
            pinned: "left",
            lockPosition: true,
            width: 150,
            flex: 0,
            filter: true,
            sortable: true,
            cellRenderer: (params) => {
              const v = params.value;
              if (!v || v === "—") return "—";
              return (
                <Button
                  type="button"
                  variant="link"
                  colorScheme="teal"
                  size="xs"
                  fontWeight="normal"
                  onClick={() => onGstinNavigate(v)}
                >
                  {v}
                </Button>
              );
            },
          },
          {
            field: "vendorName",
            headerName: "Name",
            type: "capitalized",
            pinned: "left",
            lockPosition: true,
            width: 200,
            flex: 0,
            filter: true,
            sortable: true,
          },
        ],
      },
      {
        headerName: "Total Tax",
        children: [
          {
            field: "totalTax2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalTaxPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "No. of Documents",
        children: [
          {
            field: "docCount2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 80,
          },
          {
            field: "docCountPr",
            headerName: "PR",
            filter: false,
            sortable: true,
            minWidth: 80,
            valueFormatter: (p) => (p.value == null ? "—" : String(p.value)),
          },
        ],
      },
      {
        headerName: "Total Taxable Value",
        children: [
          {
            field: "taxable2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "taxablePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
    ],
    [onGstinNavigate]
  );

  const documentColDefs = useMemo(
    () => [
      {
        headerName: "Supplier Details",
        children: [
          {
            field: "supplierName",
            headerName: "Name",
            type: "capitalized",
            pinned: "left",
            lockPosition: true,
            width: 200,
            flex: 0,
            filter: true,
            sortable: true,
          },
          {
            field: "ctin",
            headerName: "GSTIN",
            pinned: "left",
            lockPosition: true,
            width: 155,
            flex: 0,
            filter: true,
            sortable: true,
          },
        ],
      },
      {
        headerName: "Document Number",
        children: [
          {
            field: "docNo2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 140,
          },
          {
            field: "docNoPr",
            headerName: "PR",
            filter: true,
            sortable: true,
            minWidth: 140,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
        ],
      },
      {
        headerName: "Document Date",
        children: [
          {
            field: "docDate2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 118,
          },
          {
            field: "docDatePr",
            headerName: "PR",
            filter: true,
            sortable: true,
            minWidth: 118,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
        ],
      },
      {
        headerName: "Taxable Value",
        children: [
          {
            field: "taxable2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "taxablePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "IGST",
        children: [
          {
            field: "igst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "igstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "CGST",
        children: [
          {
            field: "cgst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "cgstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "SGST",
        children: [
          {
            field: "sgst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "sgstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "Total Tax Value",
        children: [
          {
            field: "totalTax2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalTaxPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "Total Value",
        children: [
          {
            field: "totalValue2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalValuePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
    ],
    []
  );

  const monthPicker = (
    <FormControl display="flex" alignItems="center" gap={2} w="auto" m={0}>
      <FormLabel fontSize="sm" m={0} whiteSpace="nowrap">
        Return month
      </FormLabel>
      <Input
        type="month"
        size="sm"
        maxW="168px"
        value={period}
        max={moment().format("YYYY-MM")}
        onChange={(e) => setPeriod(e.target.value)}
      />
    </FormControl>
  );

  const metaLine =
    meta && !loading && !error ? (
      <Text fontSize="xs" color="gray.600" mt={1}>
        Period {meta.year}-{String(meta.month).padStart(2, "0")}:{" "}
        {meta.invoice_count ?? 0} invoices, {meta.item_count ?? 0} line items
      </Text>
    ) : null;

  return (
    <GlobalWrapper
      title="GSTR 2A v Purchase Register"
      permissionKey={["view_gst_gstr2a_purchase_register"]}
    >
      <GstModuleWrapper>
        <CustomContainer
          title="GSTR 2A v Purchase Register"
          filledHeader
          rightSection={monthPicker}
        >
          {metaLine}
          {loading ? (
            <Text mt={3}>Loading…</Text>
          ) : error ? (
            <Alert status="error" borderRadius="md" mt={3}>
              <AlertIcon />
              {error}
            </Alert>
          ) : (
            <Tabs
              index={tabIndex}
              onChange={handleTabChange}
              colorScheme="teal"
              variant="enclosed"
              mt={3}
            >
              <TabList>
                <Tab fontSize="sm">Vendor View</Tab>
                <Tab fontSize="sm">Document View</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <AgGrid
                    rowData={vendorRows}
                    columnDefs={vendorColDefs}
                    tableKey={`gst-gstr2a-pr-vendor-${period}`}
                    gridOptions={{
                      getRowId: (params) => String(params.data?._rowId ?? ""),
                    }}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  {filterCtin ? (
                    <Box mb={2}>
                      <Text as="span" fontSize="sm" color="gray.700">
                        Showing documents for GSTIN{" "}
                        <Text as="span" fontWeight="semibold">
                          {filterCtin}
                        </Text>
                      </Text>
                      <Button
                        type="button"
                        variant="link"
                        colorScheme="teal"
                        size="sm"
                        ml={3}
                        onClick={() => setFilterCtin(null)}
                      >
                        Show all
                      </Button>
                    </Box>
                  ) : null}
                  <AgGrid
                    rowData={documentRows}
                    columnDefs={documentColDefs}
                    tableKey={`gst-gstr2a-pr-doc-${period}`}
                    gridOptions={{
                      getRowId: (params) => String(params.data?._rowId ?? ""),
                    }}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </CustomContainer>
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}
