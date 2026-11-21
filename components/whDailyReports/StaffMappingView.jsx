import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import WhDailyReportsHelper from "../../helper/whDailyReports";
import { LABEL, REPORTS, istDateTimeText } from "../../util/whDailyReports";

const count = (n) => Number(n || 0).toLocaleString("en-IN");
const dayText = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const errMsg = (err, fallback) => (err && err.response && err.response.data && err.response.data.msg) || (err && err.message) || fallback;
const norm = (s) => String(s || "").trim().toLowerCase();
const STAGE_COLOR = Object.fromEntries(REPORTS.map((r) => [r.key, r.color]));

/** One RetailPilot user: what they did, where, and the employee they are. */
function StaffCard({ s, employees, saving, onMap }) {
  // Employees at the store this user worked at most come first.
  const [atStore, others] = useMemo(() => {
    const here = norm(s.main_store);
    const a = [];
    const o = [];
    for (const e of employees) (here && norm(e.store) === here ? a : o).push(e);
    return [a, o];
  }, [employees, s.main_store]);
  const label = (e) => `${e.employee_name}${e.store ? ` - ${e.store}` : ""}${e.designation ? ` · ${e.designation}` : ""}`;
  const stores = Object.entries(s.stores || {}).sort((a, b) => b[1] - a[1]);

  return (
    <Box bg="white" borderWidth="1px" borderColor={s.employee_id ? "green.200" : "orange.300"} borderLeftWidth="4px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
        <Box>
          <Text fontSize="xs" color="gray.500">
            RetailPilot user
          </Text>
          <Text fontWeight="700" fontFamily="mono" wordBreak="break-all">
            {s.rp_user_id}
          </Text>
        </Box>
        {s.employee_id ? (
          <Badge colorScheme="green">Mapped</Badge>
        ) : (
          <Badge colorScheme="orange">Not mapped</Badge>
        )}
      </Flex>

      <Flex gap={1} wrap="wrap" mt={2}>
        {Object.entries(s.stages || {}).map(([k, n]) => (
          <Badge key={k} colorScheme={STAGE_COLOR[k] || "gray"} variant="subtle" textTransform="none">
            {LABEL[k] || k} {count(n)}
          </Badge>
        ))}
        {!s.lines ? (
          <Text fontSize="xs" color="gray.500">
            No work in the pulled reports
          </Text>
        ) : null}
      </Flex>
      <Text fontSize="sm" color="gray.700" mt={2}>
        <Text as="span" color="gray.500">
          Where:{" "}
        </Text>
        <Text as="span" textTransform="capitalize">
          {stores.length ? stores.slice(0, 3).map(([st, n]) => `${st} (${count(n)})`).join(", ") : "—"}
          {stores.length > 3 ? ` +${stores.length - 3} more` : ""}
        </Text>
      </Text>
      <Text fontSize="xs" color="gray.500">
        {s.last_date ? `Seen ${dayText(s.first_date)} to ${dayText(s.last_date)} · ${count(s.lines)} lines` : ""}
      </Text>

      <Flex align="center" gap={2} mt={3}>
        <Select
          size="sm"
          bg="white"
          value={s.employee_id || ""}
          isDisabled={saving}
          onChange={(e) => onMap(s, e.target.value ? Number(e.target.value) : null)}
          aria-label={`Employee for ${s.rp_user_id}`}
        >
          <option value="">- Choose employee -</option>
          {atStore.length ? (
            <optgroup label={`At ${s.main_store}`}>
              {atStore.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {label(e)}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={atStore.length ? "Everyone else" : "Employees"}>
            {others.map((e) => (
              <option key={e.employee_id} value={e.employee_id}>
                {label(e)}
              </option>
            ))}
          </optgroup>
          {s.employee_id && !employees.some((e) => e.employee_id === s.employee_id) ? (
            <option value={s.employee_id}>{s.employee_name || `Employee ${s.employee_id}`} (not active)</option>
          ) : null}
        </Select>
        {saving ? <Spinner size="sm" color="teal.500" /> : null}
      </Flex>
      {s.employee_id && s.updated_by_name ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Mapped by {s.updated_by_name}
          {s.updated_at ? ` · ${istDateTimeText(s.updated_at)}` : ""}
        </Text>
      ) : null}
    </Box>
  );
}

export default function StaffMappingView() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [show, setShow] = useState("unmapped");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState({});

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return WhDailyReportsHelper.staff()
      .then((res) => {
        if (!res || res.code !== 200) throw new Error((res && res.msg) || "Could not load staff");
        setState({ loading: false, error: null, data: res.data });
      })
      .catch((err) => setState({ loading: false, error: errMsg(err, "Could not load staff"), data: null }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const staff = useMemo(() => (state.data && state.data.staff) || [], [state.data]);
  const employees = useMemo(() => (state.data && state.data.employees) || [], [state.data]);
  const mappedCount = staff.filter((s) => s.employee_id).length;
  const shown = useMemo(() => {
    const q = norm(search);
    return staff.filter(
      (s) =>
        (show === "all" || (show === "mapped" ? s.employee_id : !s.employee_id)) &&
        (!q || norm(s.rp_user_id).includes(q) || norm(s.employee_name).includes(q) || Object.keys(s.stores || {}).some((st) => norm(st).includes(q)))
    );
  }, [staff, show, search]);

  const onMap = async (s, employeeId) => {
    setSaving((x) => ({ ...x, [s.rp_user_id]: true }));
    try {
      const res = await WhDailyReportsHelper.mapStaff(s.rp_user_id, { employee_id: employeeId });
      if (!res || res.code !== 200) throw new Error((res && res.msg) || "Could not save");
      const emp = employees.find((e) => e.employee_id === employeeId);
      toast.success(employeeId ? `${s.rp_user_id} is ${emp ? emp.employee_name : "mapped"}` : `${s.rp_user_id} unmapped`);
      // Patch in place: the card stays where it is until the next load.
      setState((st) => ({
        ...st,
        data: {
          ...st.data,
          staff: st.data.staff.map((x) =>
            x.rp_user_id === s.rp_user_id ? { ...x, employee_id: employeeId, employee_name: emp ? emp.employee_name : null, updated_by_name: null, updated_at: null } : x
          ),
        },
      }));
    } catch (err) {
      toast.error(errMsg(err, "Could not save"));
    } finally {
      setSaving((x) => ({ ...x, [s.rp_user_id]: false }));
    }
  };

  return (
    <Flex direction="column" gap={4}>
      <Box>
        <Text as="h1" fontSize="xl" fontWeight="700" color="gray.800">
          Staff Mapping
        </Text>
        <Text fontSize="sm" color="gray.500">
          RetailPilot records who picked, packed, loaded, unloaded and verified by their RetailPilot user id. Choose the employee each id is, and the Analysis shows names.
        </Text>
      </Box>

      {state.error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.loading && !state.data ? (
        <Flex minH="200px" align="center" justify="center">
          <Spinner size="lg" color="teal.500" thickness="3px" />
        </Flex>
      ) : null}

      {state.data ? (
        <>
          <Flex gap={3} wrap="wrap" align="center">
            <Badge colorScheme={mappedCount === staff.length ? "green" : "orange"} fontSize="sm" px={2} py={1}>
              {mappedCount} of {staff.length} mapped
            </Badge>
            <Select size="sm" w="auto" bg="white" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
              <option value="unmapped">Not mapped</option>
              <option value="mapped">Mapped</option>
              <option value="all">All</option>
            </Select>
            <InputGroup size="sm" w={{ base: "100%", md: "260px" }}>
              <InputLeftElement pointerEvents="none" color="gray.400">
                <i className="fa-solid fa-magnifying-glass" />
              </InputLeftElement>
              <Input bg="white" placeholder="User id, name or store" value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
          </Flex>

          {!staff.length ? (
            <Text fontSize="sm" color="gray.500">
              No RetailPilot users yet - they appear once reports are pulled from RetailPilot.
            </Text>
          ) : !shown.length ? (
            <Text fontSize="sm" color="gray.500">
              {show === "unmapped" ? "Everyone is mapped." : "Nobody matches."}
            </Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
              {shown.map((s) => (
                <StaffCard key={s.rp_user_id} s={s} employees={employees} saving={Boolean(saving[s.rp_user_id])} onMap={onMap} />
              ))}
            </SimpleGrid>
          )}
        </>
      ) : null}
    </Flex>
  );
}
