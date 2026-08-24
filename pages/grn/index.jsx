import React, { useEffect, useMemo, useState, useCallback } from "react";
import moment from "moment";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import GrnMonthCalendar from "../../components/grn/GrnMonthCalendar";
import { Flex, Text } from "@chakra-ui/react";
import { useGrnList } from "../../customHooks/useGrnList";
import toast from "react-hot-toast";

function GrnListing() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() =>
    moment().format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().clone().startOf("month")
  );

  const viewingMonthDateRange = useMemo(() => {
    const start = moment(viewingMonth).startOf("month");
    const end = moment(viewingMonth).endOf("month");
    return {
      from_date: start.format("YYYY-MM-DD"),
      to_date: end.format("YYYY-MM-DD"),
    };
  }, [viewingMonth]);

  const { grnList, loading, error } = useGrnList(viewingMonthDateRange);

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load GRN list.");
    }
  }, [error]);

  const rowData = useMemo(() => {
    return (grnList || []).filter((row) => {
      const raw = row?.mmh_mrc_dt;
      if (raw == null || raw === "") return false;
      const dayKey = String(raw).slice(0, 10);
      return dayKey === selectedDate;
    });
  }, [grnList, selectedDate]);

  const colDefs = useMemo(
    () => [
      {
        field: "mmh_mrc_refno",
        headerName: "GRN No",
        type: "id",
        flex: 1,
      },
      {
        field: "mmh_mrc_dt",
        headerName: "MRC Date",
        type: "date",
        maxWidth: 130,
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "mmh_mrc_amt",
        headerName: "MRC Amount",
        type: "currency",
        maxWidth: 140,
      },
      {
        field: "product_count",
        headerName: "No of products",
        type: "number",
        maxWidth: 160,
      },
    ],
    []
  );

  const handleRowClicked = useCallback(
    (event) => {
      const refno = event?.data?.mmh_mrc_refno;
      if (refno == null || refno === "") return;
      router.push(`/grn/view?refno=${encodeURIComponent(String(refno))}`);
    },
    [router]
  );

  const gridOptions = useMemo(
    () => ({
      onRowClicked: handleRowClicked,
      rowStyle: { cursor: "pointer" },
    }),
    [handleRowClicked]
  );

  return (
    <GlobalWrapper title="All GRN" permissionKey="view_all_grn">
      <Flex flexDirection="column" gap={6}>
        <GrnMonthCalendar
          grnList={grnList}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
          loading={loading}
        />

        <CustomContainer
          title={`All GRN (${moment(selectedDate).format("DD/MM/YYYY")})`}
          filledHeader
        >
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <AgGrid
              rowData={rowData}
              columnDefs={colDefs}
              tableKey="grn-list"
              gridOptions={gridOptions}
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default GrnListing;
