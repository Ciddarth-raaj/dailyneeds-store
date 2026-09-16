import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import usePermissions from "../../../customHooks/usePermissions";
import useDebounce from "../../../customHooks/useDebounce";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useTelegramGroups } from "../../../customHooks/useTelegramGroups";
import useOutlets from "../../../customHooks/useOutlets";
import TelegramGroupSetupGuide from "../../../components/master/TelegramGroupSetupGuide";
import {
  TELEGRAM_GROUP_CATEGORIES,
  TELEGRAM_GROUP_MESSAGES,
  BOT_ADMIN_OPTIONS,
  STATUS_OPTIONS,
  OUTLET_FILTER_NONE,
  GROUP_TYPE,
  deriveGroupType,
  displayOutlet,
  rowStatus,
} from "../../../util/telegramGroup";

/**
 * Telegram Group Registry - every group the Daily Needs bot posts to.
 *
 * Columns: Group Name | Chat ID | Type | Category | Used For | Outlet |
 * Bot Admin | Actions, with View, Map, Edit and Delete per row.
 *
 * MAP IS WHERE A GROUP'S MEMBERSHIP INTENT LIVES - which employees SHOULD
 * belong to it. It is an action on the group rather than a screen of its
 * own, because a mapping has no meaning apart from the group it maps into.
 * It changes nobody's actual Telegram membership.
 *
 * TYPE IS DERIVED FROM THE CHAT ID, never chosen and never stored: `-100…`
 * is a Supergroup and any other valid negative id is a Basic Group. The
 * server sends `group_type` with every row; it is recomputed here only as a
 * fallback so an older cached response still renders something truthful.
 *
 * THE TWO WARNINGS ARE VISIBLE IN THE LIST, not hidden on the view screen.
 * A group the bot does not administer is the one row somebody needs to spot
 * without opening anything, so Bot Admin renders as a red "No" badge with the
 * reason on hover, and a banner above the grid counts how many rows are
 * affected. Neither state stops a row existing - both are legitimate.
 *
 * Search and the category filter are SERVER-SIDE: filtering in the grid would
 * only ever search the rows already fetched.
 */
export default function TelegramGroupRegistryPage() {
  const router = useRouter();
  const canManage = usePermissions(["manage_telegram_groups"]);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const { outlets } = useOutlets({ directory: true });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [outletId, setOutletId] = useState("");
  const [botIsAdmin, setBotIsAdmin] = useState("");
  const [status, setStatus] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const { groups, loading, error, deleteGroup } = useTelegramGroups({
    search: debouncedSearch,
    category,
    outlet_id: outletId,
    bot_is_admin: botIsAdmin,
    is_active: status,
  });

  const filtersApplied =
    Boolean(search) || Boolean(category) || Boolean(outletId) || Boolean(botIsAdmin) || Boolean(status);

  const resetFilters = useCallback(() => {
    setSearch("");
    setCategory("");
    setOutletId("");
    setBotIsAdmin("");
    setStatus("");
  }, []);

  const notAdminCount = useMemo(
    () => groups.filter((g) => !g.bot_is_admin).length,
    [groups]
  );
  const basicGroupCount = useMemo(
    () => groups.filter((g) => (g.group_type || deriveGroupType(g.chat_id)) === GROUP_TYPE.BASIC_GROUP).length,
    [groups]
  );

  const handleDelete = useCallback(
    (row) =>
      confirmDelete({
        title: "Delete Telegram group",
        message: `Are you sure you want to remove "${row.group_name}" (${row.chat_id}) from the registry? This does not change the group on Telegram.`,
        onConfirm: async () => {
          await deleteGroup(row.telegram_group_id);
          toast.success("Telegram group deleted");
        },
      }),
    [confirmDelete, deleteGroup]
  );

  const colDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Group Name", flex: 2, minWidth: 180 },
      {
        field: "chat_id",
        headerName: "Chat ID",
        minWidth: 170,
        cellRenderer: (params) => (
          <span style={{ fontFamily: "monospace" }}>{params.value}</span>
        ),
      },
      {
        field: "group_type",
        headerName: "Type",
        minWidth: 140,
        type: "badge-column",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return null;
          const type = row.group_type || deriveGroupType(row.chat_id);
          return type === GROUP_TYPE.SUPERGROUP
            ? { label: GROUP_TYPE.SUPERGROUP, colorScheme: "green" }
            : { label: GROUP_TYPE.BASIC_GROUP, colorScheme: "orange" };
        },
      },
      { field: "category", headerName: "Category", minWidth: 130 },
      { field: "used_for", headerName: "Used For", flex: 2, minWidth: 200 },
      {
        field: "outlet_name",
        headerName: "Outlet",
        minWidth: 150,
        valueGetter: (params) => (params.data ? displayOutlet(params.data) : ""),
      },
      {
        field: "bot_is_admin",
        headerName: "Bot Admin",
        minWidth: 130,
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          if (row.bot_is_admin) return <Badge colorScheme="green">Yes</Badge>;
          return (
            <Tooltip label={TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING}>
              <Badge colorScheme="red">
                <i className="fa-solid fa-triangle-exclamation" /> No
              </Badge>
            </Tooltip>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        type: "badge-column",
        // Three states, and the third is the point: an active group carrying
        // a warning reads "Warning" so the rows that need chasing are visible
        // without opening anything. See util/telegramGroup#rowStatus.
        valueGetter: (params) => (params.data ? rowStatus(params.data) : null),
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const id = row.telegram_group_id;
          const actions = [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/master/telegram-groups/view?id=${id}`,
            },
            // MAP - who SHOULD belong to this group. Behind the VIEW key,
            // not the manage key: reading the mapping configuration and its
            // counts is reading, and the Add and Delete controls inside the
            // screen are what require `manage_telegram_groups`. Gating the
            // whole screen on manage would stop a store manager checking
            // which rules cover their branch.
            {
              label: "Map",
              iconType: "edit",
              redirectionUrl: `/master/telegram-groups/map?id=${id}`,
            },
          ];
          if (canManage) {
            actions.push(
              {
                label: "Edit",
                iconType: "edit",
                redirectionUrl: `/master/telegram-groups/edit?id=${id}`,
              },
              {
                label: "Delete",
                iconType: "delete",
                colorScheme: "red",
                onClick: () => handleDelete(row),
              }
            );
          }
          return actions;
        },
      },
    ],
    [canManage, handleDelete]
  );

  return (
    <GlobalWrapper
      title="Telegram Group Registry"
      permissionKey={["view_telegram_groups"]}
    >
      <ConfirmDeleteDialog />
      <TelegramGroupSetupGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <CustomContainer
        title="Telegram Group Registry"
        subtitle="Every Telegram group the Daily Needs bot posts to, what each one is used for, and whether the bot can act in it."
        filledHeader
        rightSection={
          <Flex gap={2}>
            {/* Available to everyone who can see the screen: reading how a
                group is set up is not a permission to register one. */}
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              onClick={() => setGuideOpen(true)}
              leftIcon={<i className="fa-solid fa-circle-question" />}
            >
              Setup guide
            </Button>
            {canManage ? (
              <Button
                colorScheme="purple"
                size="sm"
                onClick={() => router.push("/master/telegram-groups/create")}
              >
                Add
              </Button>
            ) : null}
          </Flex>
        }
      >
        <Flex
          gap={3}
          mb={4}
          direction={{ base: "column", md: "row" }}
          align={{ md: "flex-end" }}
          wrap="wrap"
        >
          <FormControl maxW={{ md: "320px" }}>
            <FormLabel fontSize="sm">Search</FormLabel>
            <Input
              size="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Group name, Chat ID or purpose"
            />
          </FormControl>
          <FormControl maxW={{ md: "200px" }}>
            <FormLabel fontSize="sm">Category</FormLabel>
            <Select
              size="sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="All categories"
            >
              {TELEGRAM_GROUP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl maxW={{ md: "200px" }}>
            <FormLabel fontSize="sm">Outlet</FormLabel>
            <Select
              size="sm"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              placeholder="All outlets"
            >
              {/* A filter an outlet id cannot express: the groups that
                  belong to no outlet at all. */}
              <option value={OUTLET_FILTER_NONE}>All Outlets (no specific outlet)</option>
              {outlets.map((o) => (
                <option key={o.outlet_id} value={o.outlet_id}>
                  {o.outlet_name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl maxW={{ md: "200px" }}>
            <FormLabel fontSize="sm">Bot Admin</FormLabel>
            <Select
              size="sm"
              value={botIsAdmin}
              onChange={(e) => setBotIsAdmin(e.target.value)}
              placeholder="All admin status"
            >
              {BOT_ADMIN_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.value}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl maxW={{ md: "170px" }}>
            <FormLabel fontSize="sm">Status</FormLabel>
            <Select
              size="sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="All statuses"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.value}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            onClick={resetFilters}
            isDisabled={!filtersApplied}
            leftIcon={<i className="fa-solid fa-rotate-left" />}
          >
            Reset
          </Button>
        </Flex>

        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={3}
          mb={3}
          align="stretch"
        >
          <Alert status="info" fontSize="sm" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <Box>
              <Text fontWeight="600">Chat ID format</Text>
              <Text>
                Telegram group chat IDs are negative numbers (e.g. -1001234567890). A
                positive number is an individual user, not a group, and is rejected.
              </Text>
            </Box>
          </Alert>
          <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <Box>
              <Text fontWeight="600">Basic Groups</Text>
              <Text>
                IDs not starting with -100 are basic groups. They cannot create invite
                links or remove members until converted to a supergroup.
              </Text>
            </Box>
          </Alert>
        </Stack>

        {notAdminCount > 0 ? (
          <Alert status="error" fontSize="sm" mb={3}>
            <AlertIcon />
            {notAdminCount} group{notAdminCount === 1 ? "" : "s"} below{" "}
            {notAdminCount === 1 ? "has" : "have"} the bot as a non-admin.{" "}
            {TELEGRAM_GROUP_MESSAGES.BOT_NOT_ADMIN_WARNING}
          </Alert>
        ) : null}

        {basicGroupCount > 0 ? (
          <Alert status="warning" fontSize="sm" mb={3}>
            <AlertIcon />
            {basicGroupCount} Basic Telegram Group
            {basicGroupCount === 1 ? "" : "s"} registered.{" "}
            {TELEGRAM_GROUP_MESSAGES.BASIC_GROUP_WARNING}
          </Alert>
        ) : null}

        {error ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            {error.message || "The Telegram group registry could not be loaded."}
          </Alert>
        ) : loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={groups}
            columnDefs={colDefs}
            tableKey="telegram-group-registry"
            gridOptions={{
              getRowId: (params) => String(params.data?.telegram_group_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
