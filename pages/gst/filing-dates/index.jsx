import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import GstModuleWrapper from "../../../components/gst/GstModuleWrapper";
import CustomModal from "../../../components/CustomModal";
import usePermissions from "../../../customHooks/usePermissions";
import {
  getGstVendors,
  getVendorFilingDates,
  syncGstr2aB2b,
} from "../../../helper/gstVendors";
import {
  getIndianFinancialYearMonths,
  gstFyMonthFieldKey,
  gstFyMonthHeaderLabel,
  lastMonthYYYYMM,
  parseYYYYMM,
} from "../../../util/gstFinancialYear";

function formatFilingCell(value) {
  if (value == null || value === "") return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD/MM/YYYY") : String(value);
}

function allVendorsHaveFilingForPeriod(vendors, filings, year, month) {
  if (!vendors.length || year == null || month == null) return false;
  const idsWith = new Set(
    filings
      .filter((r) => Number(r.year) === year && Number(r.month) === month)
      .map((r) => r.gst_vendor_id)
  );
  for (const v of vendors) {
    if (!idsWith.has(v.gst_vendor_id)) return false;
  }
  return true;
}

export default function GstFilingDatesPage() {
  const canSyncGstr2aB2b = usePermissions(["sync_gst_gstr2a_b2b"]);

  const [vendors, setVendors] = useState([]);
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const syncModal = useDisclosure();
  const [syncPeriod, setSyncPeriod] = useState(() => lastMonthYYYYMM());

  const fyMonths = useMemo(() => getIndianFinancialYearMonths(new Date()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const vBody = await getGstVendors();
      setVendors(Array.isArray(vBody?.data) ? vBody.data : []);

      try {
        const fBody = await getVendorFilingDates();
        setFilings(Array.isArray(fBody?.data) ? fBody.data : []);
      } catch (fe) {
        toast.error(
          fe?.message ||
            "Could not load filing dates (GST B2B storage may be off)."
        );
        setFilings([]);
      }
    } catch (e) {
      setError(e?.message || "Failed to load data");
      setVendors([]);
      setFilings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Refetch vendors + filing rows without hiding the grid (e.g. after sync). */
  const refreshFilingTable = useCallback(async () => {
    try {
      const vBody = await getGstVendors();
      setVendors(Array.isArray(vBody?.data) ? vBody.data : []);
    } catch (e) {
      toast.error(e?.message || "Could not refresh vendors after sync.");
    }
    try {
      const fBody = await getVendorFilingDates();
      setFilings(Array.isArray(fBody?.data) ? fBody.data : []);
    } catch (e) {
      toast.error(e?.message || "Could not refresh filing dates after sync.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parsedSyncPeriod = useMemo(() => parseYYYYMM(syncPeriod), [syncPeriod]);

  const showAlreadySyncedWarning = useMemo(() => {
    if (!parsedSyncPeriod) return false;
    return allVendorsHaveFilingForPeriod(
      vendors,
      filings,
      parsedSyncPeriod.year,
      parsedSyncPeriod.month
    );
  }, [vendors, filings, parsedSyncPeriod]);

  const filingLookup = useMemo(() => {
    const map = new Map();
    for (const row of filings) {
      const vid = row?.gst_vendor_id;
      const y = Number(row?.year);
      const m = Number(row?.month);
      if (vid == null || !Number.isFinite(y) || !Number.isFinite(m)) continue;
      map.set(`${vid}|${y}|${m}`, row.last_filing_date);
    }
    return map;
  }, [filings]);

  const rowData = useMemo(() => {
    return vendors.map((v) => {
      const id = v.gst_vendor_id;
      const row = {
        _rowId: String(id),
        vendor: v.vendor_name || "—",
        gst_vendor_id: id,
      };
      for (const { year, month } of fyMonths) {
        const key = gstFyMonthFieldKey(year, month);
        const raw = filingLookup.get(`${id}|${year}|${month}`);
        row[key] = raw != null && raw !== "" ? formatFilingCell(raw) : "—";
      }
      return row;
    });
  }, [vendors, fyMonths, filingLookup]);

  const columnDefs = useMemo(() => {
    const vendorCol = {
      colId: "vendor",
      field: "vendor",
      headerName: "Vendor",
      pinned: "left",
      lockPosition: true,
      minWidth: 220,
      flex: 0,
      filter: true,
      sortable: true,
    };

    const monthCols = fyMonths.map(({ year, month }) => ({
      colId: gstFyMonthFieldKey(year, month),
      field: gstFyMonthFieldKey(year, month),
      headerName: gstFyMonthHeaderLabel(year, month),
      minWidth: 118,
      maxWidth: 140,
      sortable: true,
      filter: true,
    }));

    return [vendorCol, ...monthCols];
  }, [fyMonths]);

  const openSyncModal = useCallback(() => {
    setSyncPeriod(lastMonthYYYYMM());
    syncModal.onOpen();
  }, [syncModal]);

  const runSync = useCallback(() => {
    const p = parseYYYYMM(syncPeriod);
    if (!p) {
      toast.error("Choose a valid month.");
      return;
    }
    const { year, month } = p;
    const work = (async () => {
      await syncGstr2aB2b(year, month);
      await refreshFilingTable();
    })();

    toast
      .promise(work, {
        loading: "Syncing GSTR-2A B2B…",
        success: "Sync completed.",
        error: (e) =>
          e?.message ||
          "Sync failed. Check GST portal session (OTP) if needed.",
      })
      .then(() => syncModal.onClose())
      .catch(() => {});
  }, [syncPeriod, refreshFilingTable, syncModal]);

  const syncModalFooter = (
    <>
      <Button variant="ghost" mr={3} onClick={syncModal.onClose}>
        Cancel
      </Button>
      <Button colorScheme="teal" onClick={runSync}>
        Start sync
      </Button>
    </>
  );

  const syncButton =
    canSyncGstr2aB2b && !loading && !error ? (
      <Button colorScheme="teal" size="sm" onClick={openSyncModal}>
        Sync
      </Button>
    ) : null;

  return (
    <GlobalWrapper
      title="Filing Dates"
      permissionKey={["view_gst_filing_dates"]}
    >
      <GstModuleWrapper>
        <CustomContainer
          title="Filing Dates"
          filledHeader
          rightSection={syncButton}
        >
          {loading ? (
            <Text>Loading…</Text>
          ) : error ? (
            <Text color="red.600">{error}</Text>
          ) : (
            <AgGrid
              rowData={rowData}
              columnDefs={columnDefs}
              tableKey="gst-filing-dates-fy"
              gridOptions={{
                getRowId: (params) => params.data?._rowId ?? "",
              }}
            />
          )}
        </CustomContainer>

        <CustomModal
          isOpen={syncModal.isOpen}
          onClose={syncModal.onClose}
          title="Sync GSTR-2A B2B"
          footer={syncModalFooter}
          size="md"
        >
          <FormControl mb={4}>
            <FormLabel fontSize="sm">Return month</FormLabel>
            <Input
              type="month"
              value={syncPeriod}
              onChange={(e) => setSyncPeriod(e.target.value)}
            />
          </FormControl>
          {showAlreadySyncedWarning ? (
            <Alert status="warning" borderRadius="md" fontSize="sm">
              <AlertIcon />
              Data already synced for this month for all vendors. You can still
              run sync to refresh from the portal.
            </Alert>
          ) : null}
        </CustomModal>
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}
