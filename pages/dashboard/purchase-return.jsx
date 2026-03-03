import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Box,
  Flex,
  Text,
  Grid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import DateRangeFilter from "../../components/DateRangeFilter";
import { usePurchaseReturns } from "../../customHooks/usePurchaseReturns";
import { formatYYYYMMDD } from "../../util/dateRange";
import currencyFormatter from "../../util/currencyFormatter";
import moment from "moment";

function getPrDateStr(row) {
  const dt = row?.mprh_pr_dt;
  if (dt == null) return "";
  return moment(dt).format("YYYY-MM-DD");
}

function PurchaseReturnDashboard() {
  const defaultRange = useMemo(() => {
    const today = new Date();
    const d = formatYYYYMMDD(today);
    return { date_from: d, date_to: d };
  }, []);
  const [dateFrom, setDateFrom] = useState(defaultRange.date_from);
  const [dateTo, setDateTo] = useState(defaultRange.date_to);

  const { purchaseReturns, loading } = usePurchaseReturns();

  const filtered = useMemo(() => {
    if (!Array.isArray(purchaseReturns)) return [];
    return purchaseReturns.filter((row) => {
      const prDate = getPrDateStr(row);
      if (!prDate) return false;
      return prDate >= dateFrom && prDate <= dateTo;
    });
  }, [purchaseReturns, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let totalReturns = filtered.length;
    let totalBoxes = 0;
    let totalNetAmount = 0;
    let pending = 0;
    filtered.forEach((row) => {
      const hasExtra = row?.status != null || row?.no_of_boxes != null;
      if (!hasExtra) pending += 1;
      if (row?.no_of_boxes != null) {
        totalBoxes += Number(row.no_of_boxes) || 0;
      }
      if (row?.mprh_net_amount != null) {
        totalNetAmount += Number(row.mprh_net_amount) || 0;
      }
    });
    return {
      totalReturns,
      totalBoxes,
      totalNetAmount,
      pending,
    };
  }, [filtered]);

  const byDistributor = useMemo(() => {
    const map = {};
    filtered.forEach((row) => {
      const dist = row?.distributor_name ?? "Unknown";
      if (!map[dist]) {
        map[dist] = {
          distributor_name: dist,
          boxes: 0,
          net_amount: 0,
          count: 0,
        };
      }
      map[dist].count += 1;
      if (row?.no_of_boxes != null) {
        map[dist].boxes += Number(row.no_of_boxes) || 0;
      }
      if (row?.mprh_net_amount != null) {
        map[dist].net_amount += Number(row.mprh_net_amount) || 0;
      }
    });
    return Object.values(map).sort((a, b) =>
      (b.distributor_name || "").localeCompare(a.distributor_name || "")
    );
  }, [filtered]);

  const returnsColDefs = useMemo(
    () => [
      {
        field: "mprh_pr_no",
        headerName: "Return No",
        type: "id",
        hideByDefault: true,
      },
      { field: "mprh_pr_refno", headerName: "PR No", type: "id" },
      {
        field: "distributor_name",
        headerName: "Distributor",
        type: "capitalized",
        flex: 2,
      },
      { field: "mprh_pr_dt", headerName: "PR Date", type: "date" },
      {
        field: "mprh_basic_amount",
        headerName: "Basic Amount",
        type: "currency",
        hideByDefault: true,
      },
      { field: "mprh_net_amount", headerName: "Net Amount", type: "currency" },
      { field: "no_of_boxes", headerName: "Boxes", type: "number" },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) => {
          const row = params.data;
          const hasExtra = row?.status != null || row?.no_of_boxes != null;
          if (!hasExtra) return { label: "Pending", colorScheme: "orange" };
          const status = row?.status;
          if (status === "done") return { label: "Done", colorScheme: "green" };
          return { label: "Open", colorScheme: "blue" };
        },
      },
    ],
    []
  );

  const distributorColDefs = useMemo(
    () => [
      {
        field: "distributor_name",
        headerName: "Distributor",
        type: "capitalized",
        flex: 1,
      },
      { field: "count", headerName: "Returns", type: "number" },
      {
        field: "boxes",
        headerName: "Boxes",
        type: "number",
      },
      {
        field: "net_amount",
        headerName: "Net Amount",
        type: "currency",
      },
    ],
    []
  );

  return (
    <GlobalWrapper
      title="Purchase Return Dashboard"
      permissionKey="view_purchase_return"
    >
      <Flex flexDirection="column" gap="22px">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        <Grid
          templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }}
          gap={4}
        >
          <CustomContainer title="Total Returns" filledHeader size="xs">
            <Text fontSize="2xl" fontWeight="600">
              {loading ? "—" : stats.totalReturns}
            </Text>
          </CustomContainer>
          <CustomContainer title="Boxes Ready" filledHeader size="xs">
            <Text fontSize="2xl" fontWeight="600">
              {loading ? "—" : stats.totalBoxes}
            </Text>
          </CustomContainer>
          <CustomContainer title="Net Amount" filledHeader size="xs">
            <Text fontSize="2xl" fontWeight="600">
              {loading ? "—" : `₹${currencyFormatter(stats.totalNetAmount)}`}
            </Text>
          </CustomContainer>
          <CustomContainer title="Pending" filledHeader size="xs">
            <Text fontSize="2xl" fontWeight="600">
              {loading ? "—" : stats.pending}
            </Text>
          </CustomContainer>
        </Grid>

        <Tabs colorScheme="purple" variant="enclosed" size="sm">
          <TabList>
            <Tab>Purchase Returns</Tab>
            <Tab>By Distributor</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <CustomContainer title="All purchase returns" filledHeader>
                {loading ? (
                  <Text color="gray.500">Loading...</Text>
                ) : (
                  <AgGrid
                    rowData={filtered}
                    columnDefs={returnsColDefs}
                    tableKey="purchase-return-dashboard-returns"
                    gridOptions={{
                      getRowId: (params) => params.data?.mprh_pr_no,
                    }}
                  />
                )}
              </CustomContainer>
            </TabPanel>
            <TabPanel px={0}>
              <CustomContainer
                title="Distributor wise amount and boxes"
                filledHeader
              >
                {loading ? (
                  <Text color="gray.500">Loading...</Text>
                ) : (
                  <AgGrid
                    rowData={byDistributor}
                    columnDefs={distributorColDefs}
                    tableKey="purchase-return-dashboard-by-distributor"
                    gridOptions={{
                      getRowId: (params) =>
                        String(params.data?.distributor_name ?? ""),
                    }}
                  />
                )}
              </CustomContainer>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </GlobalWrapper>
  );
}

export default PurchaseReturnDashboard;
