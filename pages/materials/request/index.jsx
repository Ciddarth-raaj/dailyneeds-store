import React, { useEffect, useMemo, useRef } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import useMaterialRequests from "../../../customHooks/useMaterialRequests";

// A request is raised against one category - the form lists that category's
// materials and takes quantities - so the items carry the category rather than
// the request. Distinct names, in case an older request spans more than one.
function categoryOf(req) {
  const names = (req?.items || [])
    .map((item) => item.material?.category_name)
    .filter(Boolean);

  return [...new Set(names)].join(", ");
}

function MaterialsRequestPage() {
  const { loading, error, requests } = useMaterialRequests();
  const gridRef = useRef(null);

  // How the page opens: only what needs acting on, newest ask first. Applied
  // to the grid rather than by trimming and re-ordering the rows, so the
  // Approval Status filter shows what is being hidden and both can be cleared
  // from the table itself. Applied once - re-applying would fight the user.
  const defaultsApplied = useRef(false);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || defaultsApplied.current || !requests?.length) return;

    api.setFilterModel({
      ...api.getFilterModel(),
      approved: { values: ["Pending"] },
    });
    api.onFilterChanged();
    api.applyColumnState({
      state: [{ colId: "created_at", sort: "desc" }],
      defaultState: { sort: null },
    });
    defaultsApplied.current = true;
  }, [requests]);

  const colDefs = useMemo(
    () => [
      {
        field: "material_request_id",
        headerName: "ID",
        type: "id",
      },
      {
        colId: "creator_name",
        headerName: "Creator Name",
        valueGetter: (params) => params.data?.creator_data?.employee_name || "",
      },
      {
        colId: "outlet_name",
        headerName: "Outlet Name",
        valueGetter: (params) => params.data?.outlet?.outlet_name || "",
      },
      {
        colId: "category",
        headerName: "Category",
        valueGetter: (params) => categoryOf(params.data),
      },
      {
        field: "created_at",
        headerName: "Raised On",
        type: "datetime",
      },
      {
        colId: "items_count",
        headerName: "Items Count",
        valueGetter: (params) => (params.data?.items || []).length,
      },
      {
        colId: "approved",
        headerName: "Approval Status",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_approved
            ? { label: "Approved", colorScheme: "green" }
            : { label: "Pending", colorScheme: "gray" },
      },
      {
        colId: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => [
          {
            label: "View",
            icon: "fa-solid fa-eye",
            redirectionUrl: `/materials/request/view?id=${params.data?.material_request_id}`,
          },
        ],
      },
    ],
    []
  );

  return (
    <GlobalWrapper title="Materials Request">
      <CustomContainer
        title="Materials Request"
        filledHeader
        rightSection={
          <Link href="/materials/request/add" passHref>
            <Button colorScheme="purple" size="sm">
              Add
            </Button>
          </Link>
        }
      >
        {error ? (
          <Text color="red.500">{error}</Text>
        ) : (
          // Mounted even while loading, so the grid's api exists by the time
          // the requests arrive and the default filter below can be applied.
          <AgGrid
            ref={gridRef}
            rowData={requests}
            columnDefs={colDefs}
            loading={loading}
            tableKey="materials-request"
            gridOptions={{
              getRowId: (params) =>
                String(params.data?.material_request_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsRequestPage;
