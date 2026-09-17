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
import useOutlets from "../../customHooks/useOutlets";
import useDesignations from "../../customHooks/useDesignations";
import useDepartments from "../../customHooks/useDepartments";
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
  narrowedCount,
  ruleLabel,
  rulePayload,
  saveBlockedReason,
  telegramConnectedLabel,
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

  const { outlets, accessDenied: outletsDenied } = useOutlets({ directory: true });
  const { designations, accessDenied: designationsDenied } = useDesignations();
  const { departments, accessDenied: departmentsDenied } = useDepartments();

  /** The options behind each dimension, from the masters already in use. */
  const optionsFor = useCallback(
    (field) => {
      switch (field) {
        case "outlet_id":
          return (outlets || []).map((o) => ({ id: o.outlet_id, name: o.outlet_name }));
        case "department_id":
          return (departments || []).map((d) => ({ id: d.department_id, name: d.department_name }));
        case "designation_id":
          return (designations || []).map((d) => ({ id: d.designation_id, name: d.designation_name }));
        default:
          return [];
      }
    },
    [outlets, departments, designations]
  );

  const deniedFor = (field) =>
    (field === "outlet_id" && outletsDenied) ||
    (field === "department_id" && departmentsDenied) ||
    (field === "designation_id" && designationsDenied);

  /** The names currently in the dropdowns, for the local rule summary. */
  const names = useMemo(() => {
    const out = {};
    for (const dimension of RULE_DIMENSIONS) {
      out[dimension.field] = {};
      for (const option of optionsFor(dimension.field)) out[dimension.field][option.id] = option.name;
    }
    return out;
  }, [optionsFor]);

  /**
   * THE PREVIEW RE-RUNS WHENEVER THE RULE OR THE SEARCH CHANGES.
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
    previewTelegramGroupMapping(telegramGroupId, { ...rulePayload(form), search })
      .then((data) => {
        if (ignore) return;
        setPreview(data);
        // Anybody no longer in the population cannot stay ticked.
        const visible = new Set((data.employees || []).map((e) => e.employee_id));
        setSelected((current) => current.filter((id) => visible.has(id)));
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
  }, [isOpen, telegramGroupId, form, search]);

  const employees = (preview && preview.employees) || [];
  const setDimension = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const toggle = (employeeId) =>
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );

  const allShownSelected = employees.length > 0 && employees.every((e) => selected.includes(e.employee_id));
  const toggleAllShown = () =>
    setSelected((current) =>
      allShownSelected
        ? current.filter((id) => !employees.some((e) => e.employee_id === id))
        : [...new Set([...current, ...employees.map((e) => e.employee_id)])]
    );

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
                isDisabled={deniedFor(dimension.field)}
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
              {deniedFor(dimension.field) && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  You are not authorised to list {dimension.label.toLowerCase()}s.
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
            placeholder="Search by name"
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
          {!loading && employees.length === 0 && (
            <Text p={4} fontSize="sm" color="gray.600">
              No employee matches this rule.
            </Text>
          )}
          {!loading && employees.length > 0 && (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th width="40px">
                    <Checkbox isChecked={allShownSelected} onChange={toggleAllShown} />
                  </Th>
                  <Th>Employee</Th>
                  <Th>Outlet</Th>
                  <Th>Department</Th>
                  <Th>Designation</Th>
                  <Th>Telegram</Th>
                </Tr>
              </Thead>
              <Tbody>
                {employees.map((employee) => (
                  <Tr key={employee.employee_id}>
                    <Td>
                      <Checkbox
                        isChecked={selected.includes(employee.employee_id)}
                        onChange={() => toggle(employee.employee_id)}
                      />
                    </Td>
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
