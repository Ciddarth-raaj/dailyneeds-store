import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import { previewTelegramGroupMapping } from "../../helper/telegramGroups";
import {
  ANY_LABEL,
  BULK_GRANT_MAX,
  MAPPING_MESSAGES,
  RULE_ACTION,
  RULE_DIMENSIONS,
  addSelectedBlockedReason,
  canAddSelected,
  canSaveRule,
  countsScopeNotice,
  isCountsUnavailable,
  allShownSelected,
  dimensionsWerePruned,
  narrowedCount,
  pruneInvalidDimensions,
  retainSelection,
  ruleLabel,
  rulePayload,
  saveBlockedReason,
  telegramConnectedLabel,
  toggleAllShown,
  visibleEmployees,
} from "../../util/telegramGroupMapping";

/**
 * MAP EMPLOYEES - Outlet, then Department, then Designation, then the people.
 *
 * ============================== THE CASCADE IS THE WHOLE POINT =============
 *
 * Each dimension is optional and each one NARROWS. Leave Outlet on "All" and
 * the rule covers every outlet; choose Moolakulam and everything below is
 * about Moolakulam. The three are joined by AND, so a rule can only ever get
 * smaller as you fill it in - a person reading the form can predict the
 * direction without being told the operator.
 *
 * NOBODY TYPES AN ID. Each dimension is picked from its existing master list,
 * so an id that does not exist cannot be submitted; the server checks again
 * anyway, because a screen is not an authorization boundary.
 *
 * ================ THE PREVIEW IS WHY THIS SCREEN EXISTS ====================
 *
 * The employees under the form are who the rule WOULD cover, live, before
 * anything is saved. Saving a rule you have not seen the population of is
 * how a group ends up containing people nobody chose. The preview writes
 * nothing and touches Telegram not at all.
 *
 * ============================ TWO ACTIONS, AND THEY DIFFER ================
 *
 * SAVE DYNAMIC RULE stores configuration. Anybody who matches it later is
 * covered automatically; anybody who stops matching stops being covered.
 *
 * ADD SELECTED EMPLOYEES adds exactly the people ticked, as MANUAL
 * membership, and writes NO rule. Inventing a rule to describe an arbitrary
 * selection is how a group ends up with configuration nobody chose and
 * nobody can read back.
 *
 * The screen says which is which in as many words, because the difference is
 * invisible afterwards and irreversible in the way that matters: a rule
 * keeps deciding, a manual grant does not.
 *
 * ============ THIS SCREEN STILL CHANGES NOBODY'S TELEGRAM ==================
 *
 * Neither action joins, invites, removes or bans anybody. Both record
 * INTENT, and the membership phase acts on it separately.
 *
 * ================== THE SELECTION CANNOT REACH OUTSIDE THE PREVIEW =========
 *
 * Only employees the preview returned can be ticked, and the preview is
 * already narrowed to the branches this viewer may see. The server enforces
 * the same scope again on the grant.
 */
export default function MapTelegramGroupEmployees({
  isOpen,
  onClose,
  telegramGroupId,
  onSaveRule,
  onAddSelected,
  submitting,
}) {
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);

  /**
   * THE CASCADE'S OPTIONS COME FROM THE PREVIEW, NOT FROM THE MASTERS.
   *
   * The server answers each level from the population the levels above it
   * already narrowed, using the same employee snapshot and the same
   * employment rule as the count. Master lists would offer combinations that
   * match nobody, and an operator who picked one would read a 0 and be
   * unable to tell a mistake from an empty outlet.
   *
   * It also means there is ONE membership rule in this system. Re-deriving
   * the cascade in the browser would be a second one, and the day the two
   * disagreed the screen would be showing a population the server does not.
   */
  const ruleOptions = useMemo(() => (preview && preview.rule_options) || {}, [preview]);
  const optionsFor = useCallback(
    (field) => (Array.isArray(ruleOptions[field]) ? ruleOptions[field] : []),
    [ruleOptions]
  );

  /** The names currently on offer, for the local rule summary. */
  const names = useMemo(() => {
    const out = {};
    for (const dimension of RULE_DIMENSIONS) {
      out[dimension.field] = {};
      for (const option of optionsFor(dimension.field)) out[dimension.field][option.id] = option.name;
    }
    return out;
  }, [optionsFor]);

  /**
   * THE PREVIEW RE-RUNS WHEN THE RULE CHANGES - AND ONLY THEN.
   *
   * `search` IS DELIBERATELY NOT A DEPENDENCY AND IS NOT SENT. It filters
   * the rows on screen and nothing else, so the preview always holds the
   * RULE's whole population. That is what makes the selection safe: pruning
   * against a search-filtered list is exactly how ticking Ravi, typing
   * "Kumar" and ticking Kumar used to drop Ravi.
   *
   * `ignore` drops a response that arrived after the rule moved on, so a
   * slow request for an older rule cannot overwrite the list for the current
   * one - the operator would otherwise tick people a different rule matched.
   */
  useEffect(() => {
    if (!isOpen || !telegramGroupId) return undefined;
    let ignore = false;
    setLoading(true);
    setError(null);
    previewTelegramGroupMapping(telegramGroupId, rulePayload(form))
      .then((data) => {
        if (ignore) return;
        setPreview(data);
        // A DOWNSTREAM VALUE THE CASCADE NO LONGER OFFERS IS CLEARED. A
        // hidden department the operator cannot see or change would go on
        // narrowing the population invisibly. Setting the form re-runs this
        // effect once with the settled rule.
        setForm((current) => {
          const pruned = pruneInvalidDimensions(current, data.rule_options || {});
          return dimensionsWerePruned(current, pruned) ? pruned : current;
        });
        // THE SELECTION BELONGS TO THE RULE'S POPULATION, not to what the
        // search box happens to be showing.
        setSelected((current) => retainSelection(current, data.employees || []));
      })
      .catch((err) => {
        if (!ignore) setError(err.message || "Could not preview this rule");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [isOpen, telegramGroupId, form]);

  /** The rule's whole population - what the selection is measured against. */
  const population = (preview && preview.employees) || [];
  /** What the table shows. The search narrows THIS, never the selection. */
  const shown = visibleEmployees(population, search);

  const setDimension = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const toggle = (employeeId) =>
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );

  const everyShownSelected = allShownSelected(selected, shown);
  const toggleShown = () => setSelected((current) => toggleAllShown(current, shown));

  const close = () => {
    setForm({});
    setSearch("");
    setSelected([]);
    setPreview(null);
    setError(null);
    onClose();
  };

  const saveBlocked = saveBlockedReason({ form, preview, saving: submitting });
  const addBlocked = addSelectedBlockedReason(selected);

  const handleSaveRule = async () => {
    setError(null);
    try {
      await onSaveRule(rulePayload(form));
      close();
    } catch (err) {
      setError(err.message || "Could not save the rule");
    }
  };

  const handleAddSelected = async () => {
    setError(null);
    try {
      await onAddSelected(selected);
      close();
    } catch (err) {
      setError(err.message || "Could not add the selected employees");
    }
  };

  const countsNotice = countsScopeNotice(preview);

  return (
    <CustomModal isOpen={isOpen} onClose={close} title="Map Employees" size="4xl">
      <Stack spacing={4}>
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          {RULE_DIMENSIONS.map((dimension) => (
            <FormControl key={dimension.field}>
              <FormLabel fontSize="sm">{dimension.label}</FormLabel>
              <Select
                size="sm"
                value={form[dimension.field] ?? ""}
                isDisabled={loading}
                onChange={(e) => setDimension(dimension.field, e.target.value)}
              >
                {/* "All" is the default and it is a real choice, not a
                    placeholder: a dimension left alone narrows nothing. */}
                <option value="">{ANY_LABEL}</option>
                {optionsFor(dimension.field).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              {!loading && optionsFor(dimension.field).length === 0 && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {/* Empty because nobody above this level has one - not
                      because the master is empty. Saying which keeps an
                      operator from hunting for a missing master row. */}
                  No {dimension.label.toLowerCase()} is available for the levels above.
                </Text>
              )}
            </FormControl>
          ))}
        </SimpleGrid>

        <Box>
          <Text fontSize="sm">
            This rule covers: <b>{ruleLabel({ rule: rulePayload(form) }, names)}</b>
          </Text>
          {narrowedCount(form) === 0 && (
            <Alert status="warning" borderRadius="md" mt={2}>
              <AlertIcon />
              {MAPPING_MESSAGES.RULE_IS_ALL_EMPLOYEES}
            </Alert>
          )}
          {preview && preview.duplicate_rule && (
            <Alert status="info" borderRadius="md" mt={2}>
              <AlertIcon />
              {MAPPING_MESSAGES.DUPLICATE_RULE}
            </Alert>
          )}
        </Box>

        <Divider />

        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <Box>
            <Text fontWeight="semibold">
              {loading ? "Counting…" : `${(preview && preview.total_matched) || 0} employee(s) match`}
            </Text>
            {preview && !isCountsUnavailable(preview) && (
              <Text fontSize="xs" color="gray.600">
                {(preview && preview.total_connected) || 0} already connected to Telegram
              </Text>
            )}
            {countsNotice && (
              <Text fontSize="xs" color="gray.600">
                {countsNotice}
              </Text>
            )}
          </Box>
          <Input
            size="sm"
            maxW="260px"
            placeholder="Search by name or employee ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Flex>

        <Box maxH="320px" overflowY="auto" borderWidth="1px" borderRadius="md">
          {loading && (
            <Flex justify="center" p={6}>
              <Spinner size="sm" />
            </Flex>
          )}
          {!loading && shown.length === 0 && (
            <Text p={4} fontSize="sm" color="gray.600">
              {population.length === 0
                ? "No employee matches this rule."
                : "No employee on this rule matches your search."}
            </Text>
          )}
          {!loading && shown.length > 0 && (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th width="40px">
                    <Checkbox isChecked={everyShownSelected} onChange={toggleShown} />
                  </Th>
                  <Th>Employee ID</Th>
                  <Th>Employee</Th>
                  <Th>Outlet</Th>
                  <Th>Department</Th>
                  <Th>Designation</Th>
                  <Th>Telegram</Th>
                </Tr>
              </Thead>
              <Tbody>
                {shown.map((employee) => (
                  <Tr key={employee.employee_id}>
                    <Td>
                      <Checkbox
                        isChecked={selected.includes(employee.employee_id)}
                        onChange={() => toggle(employee.employee_id)}
                      />
                    </Td>
                    <Td>{employee.employee_id}</Td>
                    <Td>{employee.employee_name}</Td>
                    <Td>{employee.outlet_name || "—"}</Td>
                    <Td>{employee.department_name || "—"}</Td>
                    <Td>{employee.designation_name || "—"}</Td>
                    <Td>
                      <Badge colorScheme={employee.telegram_connected ? "green" : "gray"}>
                        {telegramConnectedLabel(employee)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        <Stack spacing={1}>
          <Text fontSize="xs" color="gray.600">
            <b>{RULE_ACTION.SAVE_RULE}</b> — {MAPPING_MESSAGES.SAVE_RULE_HELP}
          </Text>
          <Text fontSize="xs" color="gray.600">
            <b>{RULE_ACTION.ADD_SELECTED}</b> — {MAPPING_MESSAGES.ADD_SELECTED_HELP}
          </Text>
        </Stack>

        <Flex justify="flex-end" gap={3} wrap="wrap">
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Tooltip label={saveBlocked || ""} isDisabled={!saveBlocked}>
            <Box>
              <Button
                size="sm"
                colorScheme="blue"
                isLoading={submitting === "rule"}
                isDisabled={!canSaveRule({ form, preview, saving: submitting })}
                onClick={handleSaveRule}
              >
                {RULE_ACTION.SAVE_RULE}
              </Button>
            </Box>
          </Tooltip>
          <Tooltip label={addBlocked || ""} isDisabled={!addBlocked}>
            <Box>
              <Button
                size="sm"
                colorScheme="teal"
                isLoading={submitting === "selected"}
                isDisabled={!canAddSelected(selected) || Boolean(submitting)}
                onClick={handleAddSelected}
              >
                {RULE_ACTION.ADD_SELECTED} ({selected.length})
              </Button>
            </Box>
          </Tooltip>
        </Flex>
        <Text fontSize="xs" color="gray.500">
          Neither action adds anybody to, or removes anybody from, a Telegram group. At most{" "}
          {BULK_GRANT_MAX} employees can be added at a time.
        </Text>
      </Stack>
    </CustomModal>
  );
}
