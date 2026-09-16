import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import usePermissions from "../../../customHooks/usePermissions";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import {
  useTelegramGroupMappings,
  useTelegramGroupMatchedEmployees,
} from "../../../customHooks/useTelegramGroupMappings";
import AddTelegramGroupMapping from "../../../components/master/AddTelegramGroupMapping";
import TelegramGroupMatchedEmployees from "../../../components/master/TelegramGroupMatchedEmployees";
import {
  addTelegramGroupMapping,
  deleteTelegramGroupMapping,
} from "../../../helper/telegramGroups";
import { displayOutlet } from "../../../util/telegramGroup";
import {
  MAPPING_MESSAGES,
  mappingTargetLabel,
  mappingTypeLabel,
  targetStatusLabel,
  targetWarning,
  targetIsBroken,
} from "../../../util/telegramGroupMapping";

/**
 * Telegram Group Mapping - WHO SHOULD BELONG TO THIS GROUP.
 *
 * At /master/telegram-groups/map?id=<telegram_group_id>, beside the
 * registry's own create / view / edit screens rather than as a second
 * Telegram administration area. Map is a fourth action on the existing
 * registry row, because a mapping belongs to the group it maps into.
 *
 * ================================ THIS SCREEN CHANGES NOBODY'S TELEGRAM ====
 *
 * It edits configuration. There is no Join, Invite, Add Member, Remove
 * Member or Sync control anywhere on it, and the API it talks to has no
 * endpoint that could perform one. Adding a mapping that turns out to be
 * wrong costs a deletion, not a person's group membership.
 *
 * ========================================= A NAME DECIDES NOTHING ==========
 *
 * A group called "Cashiers" with no mappings matches NOBODY, and the empty
 * state says so in as many words rather than showing a bare "0". So do the
 * category, the Used For text and the outlet on the registry row - none of
 * them creates membership intent. Only a mapping row maps.
 *
 * ================================ ZERO MATCHES IS NOT A BROKEN MAPPING =====
 *
 * The Status column tells three states apart. An Active target matching
 * nobody today is correct and reads "Active" with a count of 0. A target
 * that has been retired reads "Inactive" with a warning, and STILL MATCHES
 * the people assigned to it. A target that no longer exists reads "Missing".
 * Collapsing those into one number would hide real breakage behind an
 * ordinary-looking zero.
 *
 * ================================= COUNTS ARE GLOBAL, NAMES ARE SCOPED =====
 *
 * The matched count is the same for everybody, because a rule is either
 * right or wrong regardless of who is looking and a number names nobody.
 * View Employees obeys the branch scope the server resolves live, and says
 * so out loud when it is showing a subset.
 */
export default function TelegramGroupMapPage() {
  const router = useRouter();
  const { id } = router.query;
  const canManage = usePermissions(["manage_telegram_groups"]);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const { data, loading, error, refetch } = useTelegramGroupMappings(id, { enabled: Boolean(id) });
  const matched = useTelegramGroupMatchedEmployees(id);

  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeesTitle, setEmployeesTitle] = useState("");
  const [employeesOpen, setEmployeesOpen] = useState(false);

  const group = data ? data.group : null;
  const mappings = useMemo(() => (data && data.mappings) || [], [data]);

  const openEmployees = useCallback(
    (mappingId, title) => {
      setEmployeesTitle(title);
      setEmployeesOpen(true);
      matched.load(mappingId);
    },
    [matched]
  );

  const closeEmployees = useCallback(() => {
    setEmployeesOpen(false);
    matched.reset();
  }, [matched]);

  const handleAdd = useCallback(
    async (payload) => {
      setSubmitting(true);
      try {
        await addTelegramGroupMapping(id, payload);
        toast.success("Mapping added");
        setAddOpen(false);
        // The whole response is refetched rather than the row patched: every
        // count on this screen comes from one server snapshot, and a locally
        // adjusted number would be this page's arithmetic instead.
        await refetch();
      } finally {
        setSubmitting(false);
      }
    },
    [id, refetch]
  );

  const handleDelete = useCallback(
    (row) => {
      const label = `${mappingTypeLabel(row.mapping_type)} · ${mappingTargetLabel(row)}`;
      confirmDelete({
        title: MAPPING_MESSAGES.DELETE_TITLE,
        description: MAPPING_MESSAGES.deleteBody(label),
        onConfirm: async () => {
          await deleteTelegramGroupMapping(id, row.telegram_group_mapping_id);
          toast.success("Mapping removed");
          await refetch();
        },
      });
    },
    [confirmDelete, id, refetch]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "mapping_type",
        headerName: "Mapping Type",
        width: 170,
        valueGetter: (params) => (params.data ? mappingTypeLabel(params.data.mapping_type) : ""),
      },
      {
        field: "target",
        headerName: "Mapping To",
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => (params.data ? mappingTargetLabel(params.data) : ""),
      },
      {
        field: "matched_employees",
        headerName: "Matched Employees",
        width: 190,
        type: "numeric-column",
      },
      {
        field: "status",
        headerName: "Status",
        width: 170,
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const warning = targetWarning(row);
          const label = targetStatusLabel(row);
          if (!warning) {
            return <Badge colorScheme={label === "Active" ? "green" : "gray"}>{label}</Badge>;
          }
          // The warning is the whole reason the row is still here, so it is
          // on the row rather than hidden behind an icon.
          return (
            <Tooltip label={warning}>
              <Badge colorScheme={row.target_state === "MISSING" ? "red" : "orange"}>{label}</Badge>
            </Tooltip>
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const actions = [
            {
              label: "View Employees",
              iconType: "view",
              onClick: () =>
                openEmployees(
                  row.telegram_group_mapping_id,
                  `${mappingTypeLabel(row.mapping_type)} · ${mappingTargetLabel(row)}`
                ),
            },
          ];
          if (canManage) {
            actions.push({
              label: "Delete",
              iconType: "delete",
              colorScheme: "red",
              onClick: () => handleDelete(row),
            });
          }
          return actions;
        },
      },
    ],
    [canManage, handleDelete, openEmployees]
  );

  const brokenCount = mappings.filter(targetIsBroken).length;

  return (
    <GlobalWrapper title="Telegram Group Mapping">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Telegram Group Mapping"
        rightSection={
          <Flex gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/master/telegram-groups")}
            >
              Back to Registry
            </Button>
            {canManage && (
              <Button size="sm" colorScheme="purple" onClick={() => setAddOpen(true)}>
                + Add Mapping
              </Button>
            )}
          </Flex>
        }
      >
        <Stack spacing={4}>
          {loading && (
            <Box textAlign="center" py={10}>
              <Spinner color="purple.500" />
            </Box>
          )}

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Box fontSize="sm">{error.message || "Failed to load this group's mappings"}</Box>
            </Alert>
          )}

          {!loading && !error && group && (
            <>
              {/* Safe group information. No Chat ID: this screen is about
                  people, and the chat id identifies the group itself. */}
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Group Name</Text>
                    <Text fontWeight="600">{group.group_name}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Type</Text>
                    <Text>{group.group_type || "—"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Category</Text>
                    <Text>{group.category}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Outlet</Text>
                    <Text>{displayOutlet(group)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Status</Text>
                    <Badge colorScheme={group.is_active ? "green" : "gray"}>
                      {group.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Bot Admin</Text>
                    <Badge colorScheme={group.bot_is_admin ? "green" : "red"}>
                      {group.bot_is_admin ? "Yes" : "No"}
                    </Badge>
                  </Box>
                </SimpleGrid>
              </Box>

              {/* An inactive group keeps its configuration and stays
                  editable. Nothing here would act on Telegram anyway. */}
              {!group.is_active && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="sm">{group.inactive_notice || MAPPING_MESSAGES.INACTIVE_GROUP}</Box>
                </Alert>
              )}

              {brokenCount > 0 && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="sm">
                    {brokenCount} mapping{brokenCount === 1 ? "" : "s"} point at a target that is
                    inactive or no longer exists. The configuration is kept so you can decide what
                    to do with it.
                  </Box>
                </Alert>
              )}

              <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                <Text fontSize="sm" color="gray.600">
                  {data.total_matched} employee{data.total_matched === 1 ? "" : "s"} currently match
                  this group&apos;s mappings
                  {typeof data.total_connected === "number"
                    ? ` · ${data.total_connected} already connected to Telegram`
                    : ""}
                  {data.as_of_date ? ` · as of ${data.as_of_date}` : ""}
                </Text>
                {mappings.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEmployees(null, "All Matched Employees")}
                  >
                    View All Matched Employees
                  </Button>
                )}
              </Flex>

              {mappings.length === 0 ? (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="sm">{MAPPING_MESSAGES.NO_MAPPINGS}</Box>
                </Alert>
              ) : (
                <Box height="460px">
                  <AgGrid
                    rowData={mappings}
                    columnDefs={colDefs}
                    tableKey="telegram-group-mapping"
                    gridOptions={{
                      getRowId: (params) =>
                        String(params.data?.telegram_group_mapping_id ?? ""),
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Stack>
      </CustomContainer>

      <AddTelegramGroupMapping
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        submitting={submitting}
      />

      <TelegramGroupMatchedEmployees
        isOpen={employeesOpen}
        onClose={closeEmployees}
        title={employeesTitle}
        result={matched.result}
        loading={matched.loading}
        error={matched.error}
      />
    </GlobalWrapper>
  );
}
