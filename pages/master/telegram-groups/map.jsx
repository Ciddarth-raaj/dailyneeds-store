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
import MapTelegramGroupEmployees from "../../../components/master/MapTelegramGroupEmployees";
import TelegramGroupMatchedEmployees from "../../../components/master/TelegramGroupMatchedEmployees";
import TelegramGroupManagedMembership from "../../../components/master/TelegramGroupManagedMembership";
import { useTelegramGroupMembership } from "../../../customHooks/useTelegramGroupMembership";
import {
  addTelegramGroupMapping,
  grantTelegramGroupMembershipBulk,
  deleteTelegramGroupMapping,
  grantTelegramGroupMembership,
  revokeTelegramGroupMembership,
} from "../../../helper/telegramGroups";
import { displayOutlet } from "../../../util/telegramGroup";
import {
  MAPPING_MESSAGES,
  countsScopeNotice,
  groupCountSummary,
  isCountsUnavailable,
  matchedCountCell,
  matchedCountHeader,
  RULE_DIMENSIONS,
  dimensionCell,
  dimensionState,
  ruleLabel,
  TARGET_STATE,
  rowSeverity,
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
 * =========== THE RULES ARE COMPANY-WIDE, THE NUMBERS ARE THE VIEWER'S ======
 *
 * A branch manager sees every rule in full - that one says "All Employees"
 * and another says "Designation: Store Manager" - because that is
 * configuration, not somebody's staff. What narrows is every employee-derived
 * NUMBER: the per-rule count, the total and the connected count are all
 * counts of employees the viewer is authorised to see.
 *
 * SO THE SCREEN SAYS SO, IN BOTH DIRECTIONS. It never shows a branch-scoped
 * manager a bare "12", which would be false as labelled for a rule covering
 * a hundred people, and it never shows them the company's total, which is
 * information about other branches' staffing. One notice states that the
 * counts are theirs and the rules are everyone's.
 *
 * AND WHEN NOTHING COULD BE COUNTED AT ALL, IT SHOWS NO NUMBERS. An account
 * with no employee record, no branch or no session gets em dashes and a
 * sentence saying counts are unavailable - never a 0, which would be read as
 * "this rule matches nobody" and get a working rule deleted. The RULES are
 * still listed in full, because configuration is not employee information.
 */
export default function TelegramGroupMapPage() {
  const router = useRouter();
  const { id } = router.query;
  const canManage = usePermissions(["manage_telegram_groups"]);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const { data, loading, error, refetch } = useTelegramGroupMappings(id, { enabled: Boolean(id) });
  const matched = useTelegramGroupMatchedEmployees(id);
  // Phase 3C: who is MANAGED into this group, by rule and by hand.
  const membership = useTelegramGroupMembership(id, { enabled: Boolean(id) });
  const [membershipBusy, setMembershipBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  /**
   * Which of the two actions is in flight: "rule", "selected", or false.
   *
   * Not a boolean, because the two buttons do DIFFERENT things and only the
   * one that was pressed may show a spinner - a shared boolean would make
   * Save look busy while employees were being added.
   */
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

  /**
   * A grant makes the group REQUIRED for that employee. It does not - and
   * cannot - put them in the Telegram group: no bot may add a user to a
   * chat. The toast says what actually happened.
   */
  const handleGrant = useCallback(
    async (employeeId) => {
      setMembershipBusy(true);
      try {
        await grantTelegramGroupMembership(id, employeeId);
        toast.success("Added. This group is now required for them, and their Telegram panel offers the join link.");
        await membership.refetch();
      } catch (err) {
        toast.error(err.message || "Failed to add the employee");
      } finally {
        setMembershipBusy(false);
      }
    },
    [id, membership]
  );

  const handleRevoke = useCallback(
    async (employeeId) => {
      setMembershipBusy(true);
      try {
        await revokeTelegramGroupMembership(id, employeeId);
        // Deliberately not "Removed": the claim is now pending, and whether
        // anybody leaves depends on whether a mapping still matches them.
        toast.success("Removal requested. If no mapping still matches them, Diya removes them on its next pass.");
        await membership.refetch();
      } catch (err) {
        toast.error(err.message || "Failed to remove the employee");
      } finally {
        setMembershipBusy(false);
      }
    },
    [id, membership]
  );

  /**
   * SAVE DYNAMIC RULE. Stores configuration that keeps deciding: anybody who
   * matches it later is covered automatically.
   */
  const handleSaveRule = useCallback(
    async (payload) => {
      setSubmitting("rule");
      try {
        await addTelegramGroupMapping(id, payload);
        toast.success("Rule saved");
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

  /**
   * ADD SELECTED EMPLOYEES. MANUAL membership for exactly the people ticked,
   * and NO rule - one request for the whole selection rather than one per
   * employee, so the grant is all of them or none of them.
   */
  const handleAddSelected = useCallback(
    async (employeeIds) => {
      setSubmitting("selected");
      try {
        const res = await grantTelegramGroupMembershipBulk(id, employeeIds);
        toast.success(res.msg || "Employees added");
        setAddOpen(false);
        await Promise.all([refetch(), membership.refetch()]);
      } finally {
        setSubmitting(false);
      }
    },
    [id, refetch, membership]
  );

  const handleDelete = useCallback(
    (row) => {
      const label = ruleLabel(row);
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

  // ONE interpretation of counts_scope for the whole screen, from the helper
  // module - not a string comparison repeated per component.
  const countsUnavailable = isCountsUnavailable(data);

  const colDefs = useMemo(
    () => [
      // ONE COLUMN PER DIMENSION, in cascade order. A rule that narrows
      // nothing reads "All / All / All", which is what "All Employees"
      // always meant - and a rule narrowing two of them can finally be SEEN
      // to narrow two, which a single "Mapping To" cell could not show.
      ...RULE_DIMENSIONS.map((dimension) => ({
        field: dimension.field,
        headerName: dimension.label,
        flex: 1,
        minWidth: 140,
        valueGetter: (params) => (params.data ? dimensionCell(params.data, dimension.key) : ""),
      })),
      {
        field: "matched_employees",
        // The header carries the scope, so a number read on its own -
        // scanning the grid, or in a screenshot - is never mistaken for the
        // company-wide figure. It stays NEUTRAL when counts are unavailable:
        // "(your branch)" over a column of dashes would claim a branch
        // answer where there is none.
        headerName: matchedCountHeader(data),
        width: matchedCountHeader(data).length > 20 ? 240 : 190,
        // An em dash rather than 0 when nothing could be counted. A zero
        // there reads as a finding, and the finding it suggests - "this rule
        // matches nobody" - is what gets a working rule deleted.
        valueGetter: (params) => matchedCountCell(params.data, data),
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
          // on the row rather than hidden behind an icon. The colour comes
          // from the SAME derivation as the label, so the badge and the
          // words can never describe different dimensions.
          return (
            <Tooltip label={warning}>
              <Badge colorScheme={rowSeverity(row) === TARGET_STATE.MISSING ? "red" : "orange"}>
                {label}
              </Badge>
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
                  ruleLabel(row)
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
    [data, canManage, handleDelete, openEmployees]
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
                + Map Employees
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

              {/* Said ONCE, near the numbers it qualifies, rather than on
                  every row. It states both halves: the counts are yours, the
                  rules are the company's. */}
              {countsScopeNotice(data) && (
                <Alert status={countsUnavailable ? "warning" : "info"} borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="sm">{countsScopeNotice(data)}</Box>
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
                  {groupCountSummary(data)}
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

              <TelegramGroupManagedMembership
                claims={membership.claims}
                loading={membership.loading}
                error={membership.error}
                canManage={canManage}
                onGrant={handleGrant}
                onRevoke={handleRevoke}
                busy={membershipBusy}
              />

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

      <MapTelegramGroupEmployees
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        telegramGroupId={id}
        onSaveRule={handleSaveRule}
        onAddSelected={handleAddSelected}
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
