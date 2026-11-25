import React, { useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Skeleton,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import AgGrid from "../AgGrid";
import EmptyData from "../EmptyData";
import WorkItemCard from "./WorkItemCard";
import {
  dueMeta,
  formatDate,
  itemTypeMeta,
  priorityMeta,
  statusMeta,
} from "../../constants/workItems";

/**
 * One list, two presentations: the AG Grid table on desktop, and stacked cards
 * on a phone where nine flex columns would be about 40px wide each.
 */
function WorkItemList({
  items,
  loading,
  count = 0,
  page = 0,
  pageSize = 20,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  canChangeStatus,
  canEdit,
  canDelete,
  tableKey,
  emptyMessage = "Nothing here yet",
  emptyAction,
}) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const columnDefs = useMemo(
    () => buildColumnDefs({ onOpen, onEdit, onDelete, canEdit, canDelete }),
    [onOpen, onEdit, onDelete, canEdit, canDelete]
  );

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading && (!items || items.length === 0)) {
    return (
      <Flex direction="column" gap="10px">
        {[0, 1, 2, 3, 4].map((key) => (
          <Skeleton key={key} height={isMobile ? "150px" : "44px"} borderRadius="8px" />
        ))}
      </Flex>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyData message={emptyMessage} button={emptyAction} />;
  }

  return (
    <Box>
      {isMobile ? (
        <Flex direction="column" gap="10px" opacity={loading ? 0.6 : 1}>
          {items.map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              onOpen={onOpen}
              onStatusChange={onStatusChange}
              canChangeStatus={canChangeStatus}
            />
          ))}
        </Flex>
      ) : (
        <AgGrid
          rowData={items}
          columnDefs={columnDefs}
          tableKey={tableKey}
          loading={loading}
          gridOptions={{ pagination: false }}
        />
      )}

      {count > pageSize && (
        <Flex
          mt="16px"
          gap="10px"
          alignItems="center"
          justifyContent="space-between"
          direction={{ base: "column", sm: "row" }}
        >
          <Text fontSize="xs" color="gray.500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)} of{" "}
            {count}
          </Text>
          <Flex gap="8px" alignItems="center">
            <Button
              size="sm"
              variant="outline"
              isDisabled={page <= 0 || loading}
              onClick={() => onPageChange && onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
              Page {page + 1} of {totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              isDisabled={page + 1 >= totalPages || loading}
              onClick={() => onPageChange && onPageChange(page + 1)}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}

/** Uses the shared badge/action column types so tickets match the other modules. */
function buildColumnDefs({ onOpen, onEdit, onDelete, canEdit, canDelete }) {
  return [
    { field: "id", headerName: "ID", type: "id", maxWidth: 90 },
    {
      field: "title",
      headerName: "Title",
      minWidth: 220,
      flex: 2,
      tooltipField: "title",
    },
    {
      colId: "item_type",
      headerName: "Type",
      type: "badge-column",
      maxWidth: 110,
      valueGetter: ({ data }) => {
        const meta = itemTypeMeta(data?.item_type);
        return { label: meta.label, colorScheme: meta.colorScheme };
      },
    },
    {
      colId: "status",
      headerName: "Status",
      type: "badge-column",
      maxWidth: 140,
      valueGetter: ({ data }) => {
        const meta = statusMeta(data?.status);
        return { label: meta.label, colorScheme: meta.colorScheme };
      },
    },
    {
      colId: "priority",
      headerName: "Priority",
      type: "badge-column",
      maxWidth: 130,
      valueGetter: ({ data }) => {
        const meta = priorityMeta(data?.priority);
        return { label: meta.label, colorScheme: meta.colorScheme };
      },
    },
    {
      colId: "due",
      headerName: "Due",
      type: "badge-column",
      maxWidth: 170,
      valueGetter: ({ data }) => {
        const meta = dueMeta(data?.due_date, data?.status);
        if (!meta) return null;
        return { label: meta.label, colorScheme: meta.colorScheme };
      },
    },
    {
      colId: "progress",
      headerName: "Checklist",
      maxWidth: 120,
      valueGetter: ({ data }) => {
        const total = Number(data?.checklist_total) || 0;
        if (!total) return "";
        return `${Number(data?.checklist_done) || 0}/${total}`;
      },
    },
    {
      field: "outlet_name",
      headerName: "Branch",
      type: "capitalized",
      minWidth: 130,
    },
    {
      field: "department_name",
      headerName: "Department",
      type: "capitalized",
      minWidth: 130,
    },
    {
      field: "assigned_to_name",
      headerName: "Assigned To",
      type: "capitalized",
      minWidth: 140,
    },
    {
      field: "created_by_name",
      headerName: "Created By",
      type: "capitalized",
      minWidth: 140,
      hideByDefault: true,
    },
    {
      colId: "created_at",
      headerName: "Created",
      minWidth: 120,
      hideByDefault: true,
      valueGetter: ({ data }) => formatDate(data?.created_at),
    },
    {
      colId: "actions",
      headerName: "Action",
      type: "action-column",
      valueGetter: ({ data }) => {
        if (!data) return [];
        const items = [{ label: "View", onClick: () => onOpen && onOpen(data) }];
        if (canEdit) {
          items.push({ label: "Edit", onClick: () => onEdit && onEdit(data) });
        }
        if (canDelete) {
          items.push({
            label: "Delete",
            onClick: () => onDelete && onDelete(data),
          });
        }
        return items;
      },
    },
  ];
}

export default WorkItemList;
