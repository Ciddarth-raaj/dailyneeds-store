import React, { useCallback, useMemo, useState } from "react";
import { Button, Flex, useBreakpointValue } from "@chakra-ui/react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

import GlobalWrapper from "../globalWrapper/globalWrapper";
import CustomContainer from "../CustomContainer";
import SummaryStrip from "./SummaryStrip";
import WorkItemFilters from "./WorkItemFilters";
import WorkItemList from "./WorkItemList";

import { useTickets, useTicketSummary } from "../../customHooks/useTickets";
import useOutlets from "../../customHooks/useOutlets";
import { useTelegramDepartments } from "../../customHooks/useTelegramDepartments";
import usePermissions from "../../customHooks/usePermissions";
import { useUser } from "../../contexts/UserContext";
import { deleteTicket, updateTicket } from "../../helper/tickets";
import { itemTypeMeta } from "../../constants/workItems";

const PAGE_SIZE = 20;

/**
 * The list screen behind /tickets, /tasks and /my-work.
 *
 * The three differ only in which items they scope to and what they let you
 * create, so they share one implementation rather than three near-copies.
 */
function WorkItemsPage({
  title,
  itemType,
  scope = "all",
  permissionKey,
  tableKey,
  createLabel,
  createType,
  emptyMessage,
}) {
  const router = useRouter();
  const { employeeId } = useUser().userConfig;
  const { outlets } = useOutlets();
  const { departments } = useTelegramDepartments();

  const isMobile = useBreakpointValue({ base: true, md: false });

  const canCreate = usePermissions(
    itemType === "task" ? ["add_tasks", "add_tickets"] : ["add_tickets"]
  );
  const canEdit = usePermissions(["edit_tickets", "add_tickets", "add_tasks"]);
  const canDelete = usePermissions(["delete_tickets"]);

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({});

  // "My Work" scopes to the signed-in employee, so it must wait for their id
  // rather than firing a request with a missing filter.
  const needsEmployee = scope === "mine";
  const ready = !needsEmployee || Boolean(employeeId);

  const queryFilters = useMemo(() => {
    const query = {
      ...filters,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };

    if (itemType) query.item_type = itemType;
    if (scope === "mine") query.assigned_to = employeeId;
    if (scope === "raised") query.created_by = employeeId;

    return query;
  }, [filters, page, itemType, scope, employeeId]);

  const summaryFilters = useMemo(() => {
    const query = {};
    if (itemType) query.item_type = itemType;
    if (scope === "mine") query.assigned_to = employeeId;
    if (scope === "raised") query.created_by = employeeId;
    return query;
  }, [itemType, scope, employeeId]);

  const { tickets, count, loading, refetch } = useTickets(queryFilters, {
    enabled: ready,
  });
  const { summary, refetch: refetchSummary } = useTicketSummary(summaryFilters, {
    enabled: ready,
  });

  // A combined view has no type of its own, so new items default to tasks.
  const newItemType = createType || itemType || "task";
  const fromQuery = `&from=${encodeURIComponent(router.pathname)}`;

  const handleOpen = useCallback(
    (item) => router.push(`/tickets/view?id=${item.id}${fromQuery}`),
    [router, fromQuery]
  );

  const handleEdit = useCallback(
    (item) => router.push(`/tickets/edit?id=${item.id}${fromQuery}`),
    [router, fromQuery]
  );

  const handleDelete = useCallback(
    async (item) => {
      const label = itemTypeMeta(item.item_type).label.toLowerCase();
      if (
        !window.confirm(
          `Delete ${label} #${item.id} "${item.title}"? This cannot be undone.`
        )
      ) {
        return;
      }

      const toastId = toast.loading("Deleting...");
      try {
        const response = await deleteTicket(item.id);
        if (response && response.code === 200) {
          toast.success("Deleted", { id: toastId });
          refetch();
          refetchSummary();
        } else {
          throw response;
        }
      } catch (err) {
        toast.error("Could not delete this item", { id: toastId });
      }
    },
    [refetch, refetchSummary]
  );

  /** Status changed straight from the card, without opening the form. */
  const handleStatusChange = useCallback(
    async (item, status) => {
      const toastId = toast.loading("Updating status...");
      try {
        const response = await updateTicket(item.id, { status });
        if (response && (response.id || response.code === 200)) {
          toast.success("Status updated", { id: toastId });
          refetch();
          refetchSummary();
        } else {
          throw response;
        }
      } catch (err) {
        toast.error("Could not update status", { id: toastId });
      }
    },
    [refetch, refetchSummary]
  );

  const activeTile = filters.overdue
    ? "overdue"
    : filters.unassigned
    ? "unassigned"
    : filters.status === "in_progress"
    ? "in_progress"
    : filters.is_open
    ? "open"
    : null;

  const handleTileSelect = (key) => {
    setPage(0);
    setFilters((current) => {
      const next = {
        ...current,
        is_open: undefined,
        overdue: undefined,
        unassigned: undefined,
        status: undefined,
      };
      if (key === "open") next.is_open = true;
      if (key === "overdue") next.overdue = true;
      if (key === "unassigned") next.unassigned = true;
      if (key === "in_progress") next.status = "in_progress";
      return next;
    });
  };

  const createButton = canCreate ? (
    <Button
      colorScheme="purple"
      size="sm"
      width={{ base: "100%", md: "auto" }}
      onClick={() => router.push(`/tickets/create?type=${newItemType}`)}
    >
      {createLabel}
    </Button>
  ) : null;

  return (
    <GlobalWrapper title={title} permissionKey={permissionKey}>
      <CustomContainer
        title={title}
        filledHeader
        rightSection={!isMobile ? createButton : null}
      >
        {isMobile && createButton ? (
          <Flex mb="14px">{createButton}</Flex>
        ) : null}

        <SummaryStrip
          summary={summary}
          loading={loading && !summary}
          active={activeTile}
          onSelect={handleTileSelect}
        />

        <WorkItemFilters
          value={filters}
          onChange={(next) => {
            setPage(0);
            setFilters(next);
          }}
          outlets={outlets || []}
          departments={departments || []}
          showTypeFilter={!itemType}
        />

        <WorkItemList
          items={tickets}
          loading={loading}
          count={count}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onOpen={handleOpen}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          canChangeStatus
          canEdit={canEdit}
          canDelete={canDelete}
          tableKey={tableKey}
          emptyMessage={emptyMessage}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default WorkItemsPage;
