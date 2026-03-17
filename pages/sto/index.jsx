import React, { useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import useStockTransfer from "../../customHooks/useStockTransfer";
import usePermissions from "../../customHooks/usePermissions";

function computeRowFromTransfer(transfer) {
  const items = transfer.items || [];
  const totalItems =
    transfer.Tot_Items != null ? Number(transfer.Tot_Items) : items.length;
  const totalFileItems = items.filter((item) => item.file_qty != null).length;
  const missingItems = items.filter((item) => {
    const qty = item.Item_qty != null ? Number(item.Item_qty) : 0;
    const fileQty = item.file_qty != null ? Number(item.file_qty) : null;
    if (fileQty === null) return qty !== 0;
    return Number(fileQty) !== Number(qty);
  }).length;

  return {
    dn_no: transfer.Dn_no,
    dn_ref_no: transfer.Dn_Ref_no,
    total_items: totalItems,
    total_file_items: totalFileItems,
    missing_items: missingItems,
    _raw: transfer,
  };
}

function STOListing() {
  const canAdd = usePermissions("add_sto");
  const { transfers, loading } = useStockTransfer({ is_checked: true });

  const rowData = useMemo(() => {
    return (transfers || []).map(computeRowFromTransfer);
  }, [transfers]);

  const colDefs = useMemo(
    () => [
      { field: "dn_no", headerName: "DN No" },
      { field: "dn_ref_no", headerName: "DN Ref No" },
      { field: "total_items", headerName: "Total Items" },
      { field: "total_file_items", headerName: "Total File Items" },
      { field: "missing_items", headerName: "Missing Items" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const dnRefNo = row.dn_ref_no;
          return [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/sto/view?id=${dnRefNo}`,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: `/sto/edit?id=${dnRefNo}`,
            },
          ];
        },
      },
    ],
    []
  );

  return (
    <GlobalWrapper title="Stock Transfer Out" permissionKey="view_sto">
      <CustomContainer
        title="Stock Transfer Out"
        filledHeader
        rightSection={
          canAdd ? (
            <Link href="/sto/create" passHref>
              <Button colorScheme="purple" size="sm" as="a">
                Create
              </Button>
            </Link>
          ) : null
        }
      >
        {loading ? (
          <Text py={4} color="gray.600">
            Loading...
          </Text>
        ) : (
          <AgGrid rowData={rowData} columnDefs={colDefs} tableKey="sto-list" />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default STOListing;
