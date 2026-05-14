import React, { useMemo } from "react";
import moment from "moment";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import GstModuleWrapper from "../../../components/gst/GstModuleWrapper";
import { useGstVendors } from "../../../customHooks/useGstVendors";

function GstVendorsListingPage() {
  const { vendors, loading } = useGstVendors();

  const colDefs = useMemo(
    () => [
      {
        field: "gst_vendor_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "gstin",
        headerName: "GSTIN",
      },
      {
        field: "vendor_name",
        headerName: "Vendor name",
        type: "capitalized",
      },
      {
        field: "last_filing_date",
        headerName: "Last filed date",
        minWidth: 140,
        valueGetter: (params) => {
          const v = params.data?.last_filing_date;
          if (v == null || v === "") return "—";
          const m = moment(v);
          return m.isValid() ? m.format("DD/MM/YYYY") : String(v);
        },
      },
      {
        field: "is_active",
        headerName: "Active",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_active
            ? { label: "Yes", colorScheme: "green" }
            : { label: "No", colorScheme: "gray" },
      },
      {
        field: "created_at",
        headerName: "Created",
        type: "datetime",
      },
      {
        field: "updated_at",
        headerName: "Updated",
        type: "datetime",
      },
    ],
    []
  );

  return (
    <GlobalWrapper title="GST vendors" permissionKey={["view_gst_vendors"]}>
      <GstModuleWrapper>
        <CustomContainer title="GST vendors" filledHeader>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <AgGrid
              rowData={vendors}
              columnDefs={colDefs}
              tableKey="gst-vendors-list"
              gridOptions={{
                getRowId: (params) => String(params.data?.gst_vendor_id ?? ""),
              }}
            />
          )}
        </CustomContainer>
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}

export default GstVendorsListingPage;
