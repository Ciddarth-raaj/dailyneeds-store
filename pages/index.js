import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import CustomContainer from "../components/CustomContainer";
import { useAccounts } from "../customHooks/useAccounts";
import moment from "moment";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import currencyFormatter from "../util/currencyFormatter";
import FromToDateOutletPicker from "../components/DateOutletPicker/FromToDateOutletPicker";
import { useUser } from "../contexts/UserContext";
import AgGrid from "../components/AgGrid";
import { capitalize } from "../util/string";
import Badge from "../components/Badge";
import EmptyData from "../components/EmptyData";

const StatsCardItem = (label, value, colorScheme) => {
  return (
    <Box>
      <Text fontSize="xs" color="gray.600" fontWeight="medium">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${colorScheme}.800`}>
        {value}
      </Text>
    </Box>
  );
};

function Index() {
  const { storeId } = useUser().userConfig;

  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  const filters = useMemo(() => {
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [fromDate, toDate]);

  const { mappedAccounts, totalData, accounts } = useAccounts(filters);
  const mappedTotalData = selectedOutlet
    ? mappedAccounts[selectedOutlet] ?? {}
    : { ...totalData, accountsList: accounts };

  const mtdFilter = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(1);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, []);
  const { totalData: mtdTotalDataP, accounts: mtdAccounts } =
    useAccounts(mtdFilter);
  const mtdTotalData = { ...mtdTotalDataP, accountsList: mtdAccounts };

  const groupedByCashier = (mappedTotalData?.accountsList ?? []).reduce(
    (acc, item) => {
      if (!acc[item.cashier_id]) {
        acc[item.cashier_id] = {
          no_of_bills: 0,
          total_sales: 0,
          cashier_name: item.cashier_name,
          outlet_name: item.outlet_name,
        };
      }

      acc[item.cashier_id].no_of_bills += parseInt(item.no_of_bills || 0, 10);
      acc[item.cashier_id].total_sales += parseFloat(item.total_sales || 0);

      return acc;
    },
    {}
  );

  const highestByOutlet = Object.values(groupedByCashier).reduce(
    (acc, { outlet_name, total_sales = 0, no_of_bills = 0 }) => {
      const outletStats = acc[outlet_name] ?? {
        highestTotalSales: 0,
        highestNoOfBills: 0,
      };

      if (total_sales > 0) {
        outletStats.highestTotalSales = Math.max(
          outletStats.highestTotalSales,
          total_sales
        );
      }
      if (no_of_bills > 0) {
        outletStats.highestNoOfBills = Math.max(
          outletStats.highestNoOfBills,
          no_of_bills
        );
      }

      acc[outlet_name] = outletStats;
      return acc;
    },
    {}
  );

  Object.values(groupedByCashier).forEach((cashier) => {
    const outletStats = highestByOutlet[cashier.outlet_name] ?? {
      highestTotalSales: 0,
      highestNoOfBills: 0,
    };

    cashier.has_highest_total_sales =
      outletStats.highestTotalSales > 0 &&
      cashier.total_sales === outletStats.highestTotalSales;
    cashier.has_highest_no_of_bills =
      outletStats.highestNoOfBills > 0 &&
      cashier.no_of_bills === outletStats.highestNoOfBills;
  });

  const cashiersList = Object.values(groupedByCashier).sort((a, b) => {
    // Place cashiers with has_highest_total_sales or has_highest_no_of_bills at the top
    const aIsTop =
      a.has_highest_total_sales || a.has_highest_no_of_bills ? 1 : 0;
    const bIsTop =
      b.has_highest_total_sales || b.has_highest_no_of_bills ? 1 : 0;
    return bIsTop - aIsTop;
  });

  useEffect(() => {
    if (storeId) {
      setSelectedOutlet(storeId);
    }
  }, [storeId]);

  const OverallStatsCard = (totalData, title, colorScheme = "purple") => {
    const isEmpty =
      totalData?.accountsList == undefined ||
      totalData?.accountsList?.length === 0;

    return (
      <CustomContainer
        title={title}
        filledHeader
        smallHeader
        colorScheme={colorScheme}
      >
        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          {StatsCardItem(
            "Total Sales",
            isEmpty ? "-" : currencyFormatter(totalData?.total_sales),
            colorScheme
          )}
          {StatsCardItem(
            "Total Bills",
            isEmpty ? "-" : totalData?.no_of_bills,
            colorScheme
          )}
          {StatsCardItem(
            "Avg Bill Value",
            isEmpty || totalData?.no_of_bills == 0
              ? "-"
              : currencyFormatter(
                  totalData?.total_sales / totalData?.no_of_bills
                ),
            colorScheme
          )}
        </Grid>
      </CustomContainer>
    );
  };

  const getMTDTitle = () => {
    return `Month to Date Statistics (${moment(mtdFilter.from_date).format(
      "DD/MM/YY"
    )} - ${moment(mtdFilter.to_date).format("DD/MM/YY")})`;
  };

  const colDefs = [
    {
      field: "cashier_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => {
        return (
          <Flex alignItems="center" gap="10px">
            <Text>{capitalize(props.value)}</Text>
            {props.data.has_highest_total_sales && (
              <Badge colorScheme="green">Highest Sales</Badge>
            )}
            {props.data.has_highest_no_of_bills && (
              <Badge colorScheme="blue">Highest Bills</Badge>
            )}
          </Flex>
        );
      },
    },
    {
      field: "outlet_name",
      headerName: "Branch",
      resizable: true,
      cellRenderer: (props) => capitalize(props.value),
    },
    {
      field: "total_sales",
      headerName: "Total Sales",
      resizable: true,
      cellRenderer: (props) => currencyFormatter(props.value),
    },
    {
      field: "no_of_bills",
      headerName: "No of Bills",
      resizable: true,
      cellRenderer: (props) => props.value,
    },
  ];

  return (
    <GlobalWrapper permissionKey="dashboard">
      <Flex flexDirection="column" gap="22px">
        <FromToDateOutletPicker
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          selectedOutlet={selectedOutlet}
          setSelectedOutlet={setSelectedOutlet}
          style={{ background: "white" }}
          disabled={storeId !== null}
        />

        {OverallStatsCard(mtdTotalData, getMTDTitle(), "blue")}

        {cashiersList.length > 0 ? (
          <>
            {OverallStatsCard(mappedTotalData, "Overall Statistics")}

            <CustomContainer title="Cashiers" smallHeader>
              <AgGrid rowData={cashiersList} colDefs={colDefs} />
            </CustomContainer>
          </>
        ) : (
          <CustomContainer>
            <EmptyData
              message={
                <Text>
                  No data for selected date range
                  <Text fontSize="sm" color="purple.300">
                    ({moment(fromDate).format("DD/MM/YY")} -
                    {moment(toDate).format("DD/MM/YY")})
                  </Text>
                </Text>
              }
            />
          </CustomContainer>
        )}
      </Flex>
    </GlobalWrapper>
  );
}

export default Index;
