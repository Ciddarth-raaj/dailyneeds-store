import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
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
    </GlobalWrapper>
  );
}

export default GstVendorsListingPage;
