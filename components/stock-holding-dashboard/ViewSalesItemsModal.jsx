import React, { useMemo } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import {
  getSalesItemsColumnDefs,
  SALES_ITEMS_TABLE_KEY,
} from "./salesItemsColumnDefs";

export default function ViewSalesItemsModal({
  isOpen,
  onClose,
  title,
  rows = [],
  loading = false,
}) {
  const columnDefs = useMemo(() => getSalesItemsColumnDefs(), []);

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title={title} size="6xl">
      {loading ? (
        <Center py={10}>
          <Spinner size="lg" color="purple.500" />
        </Center>
      ) : (
        <AgGrid
          tableKey={`${SALES_ITEMS_TABLE_KEY}-modal`}
          rowData={rows}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={20}
        />
      )}
    </CustomModal>
  );
}
