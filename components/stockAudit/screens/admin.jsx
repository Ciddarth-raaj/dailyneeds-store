import React, { useState } from "react";
import { Badge, Box, Button, Checkbox, Flex, Input, NumberInput, NumberInputField, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import toast from "react-hot-toast";
import { adapter, useLoad, isLive } from "../data/adapter";
import { EMPLOYEE_SLABS, MANAGEMENT, PROGRAMME_START } from "../data/calc";
import { DataList, KV, Pill, PreviewButton, Section, StatCard, StatGrid, BRAND, fmtDate, fmtDateTime, fmtNum } from "../ui";
import { Screen, Loader } from "./common";
import { P } from "../permissions";

/** Changes something only in DNDS Connect (live); the preview never saves. */
async function act(fn, ok) {
  if (!isLive()) return toast("Preview only: nothing is saved.", { icon: "👁" });
  try {
    await fn();
    toast.success(ok);
    return true;
  } catch (e) {
    toast.error((e && e.message) || "Failed");
    return false;
  }
}

export function CycleMaster() {
  const { can, meta } = useStockAudit();
  const [tick, setTick] = useState(0);
  const s = useLoad(() => adapter.cycles(), [tick]);
  const [form, setForm] = useState({ period_code: "2026-Q4", name: "Q4 2026 Full Audit", start_date: "2026-11-25", deadline: "2026-12-05", end_date: "2026-12-10" });
  const [stores, setStores] = useState(() => new Set(meta.stores.map((x) => x.outlet_id)));
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const rows = (d) => (Array.isArray(d) ? d.map((c) => ({ ...c, stores: Array.isArray(c.stores) ? c.stores : (c.cycles || []).map((x) => x.outlet_id) })) : []);
  return (
    <Screen title="Audit Cycle Master" subtitle="One audit period for all programme stores, with a common deadline. Programme start: 25 Nov 2026, 00:00 IST.">
      <Section title="Audit periods">
        <Loader s={s}>
          {(d) => (
            <DataList
              rows={rows(d)} keyOf={(r) => r.period_code || r.cycle_id}
              columns={[
                { key: "name", label: "Cycle", primary: true },
                { key: "period", label: "Period", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.period_code}</Text> },
                { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color="green">{String(r.status || r.statuses || "").toLowerCase()}</Pill> },
                { key: "start", label: "Start", render: (r) => fmtDate(r.start_date) },
                { key: "deadline", label: "Audit deadline", render: (r) => fmtDate(r.deadline) },
                { key: "end", label: "End", render: (r) => fmtDate(r.end_date) },
                { key: "stores", label: "Branches", render: (r) => `${r.stores.length} retail stores` },
              ]}
            />
          )}
        </Loader>
      </Section>
      {can(P.CYCLES) ? (
        <Section title="New audit period" subtitle="Creates one cycle for each ticked store. A store cannot have two cycles for one period.">
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <Box><Text fontSize="xs" mb={1}>Name</Text><Input size="sm" h="40px" value={form.name} onChange={f("name")} /></Box>
            <Box><Text fontSize="xs" mb={1}>Period code</Text><Input size="sm" h="40px" value={form.period_code} onChange={f("period_code")} /></Box>
            <Box><Text fontSize="xs" mb={1}>Common audit deadline</Text><Input size="sm" h="40px" type="date" value={form.deadline} onChange={f("deadline")} /></Box>
            <Box><Text fontSize="xs" mb={1}>Start</Text><Input size="sm" h="40px" type="date" value={form.start_date} onChange={f("start_date")} /></Box>
            <Box><Text fontSize="xs" mb={1}>End</Text><Input size="sm" h="40px" type="date" value={form.end_date} onChange={f("end_date")} /></Box>
          </SimpleGrid>
          <Text fontSize="xs" mt={4} mb={1} color="gray.600">Participating branches</Text>
          <SimpleGrid columns={{ base: 2, md: 6 }} spacing={2}>
            {meta.stores.map((x) => (
              <Checkbox key={x.outlet_id} isChecked={stores.has(x.outlet_id)} colorScheme="purple"
                onChange={(e) => { const n = new Set(stores); if (e.target.checked) n.add(x.outlet_id); else n.delete(x.outlet_id); setStores(n); }}>{x.name}</Checkbox>
            ))}
            <Checkbox isDisabled>Warehouse (excluded)</Checkbox>
          </SimpleGrid>
          <Flex mt={4} gap={2}>
            <Button size="sm" minH="38px" colorScheme="purple" onClick={async () => (await act(() => adapter.createCycle({ ...form, outlet_ids: [...stores] }), "Audit period created")) && setTick(tick + 1)}>Create period</Button>
          </Flex>
        </Section>
      ) : null}
    </Screen>
  );
}

export function EmployeeMapping() {
  const { can } = useStockAudit();
  const [tick, setTick] = useState(0);
  const s = useLoad(() => adapter.mapping(), [tick]);
  const ch = useLoad(() => (adapter.mappingEmployees ? adapter.mappingEmployees() : Promise.resolve([])), []);
  const [pick, setPick] = useState({});
  const save = async (r, employeeId) => (await act(() => adapter.setMapping(r.rp_user_id, employeeId), "Mapping saved")) && setTick(tick + 1);
  return (
    <Screen title="RetailPilot Employee Mapping" subtitle="Maps RetailPilot (Keypoint) user IDs to DNDS employees. One map shared with the warehouse screens (wh_rp_staff_map). Nobody can map a user to themself.">
      <Loader s={s}>
        {(rows) => {
          const unmapped = rows.filter((r) => !r.mapped);
          const choices = (r) => (ch.data || []).filter((e) => r.outlet_id == null || Number(e.store_id) === r.outlet_id);
          return (
            <>
              <StatGrid cols={{ base: 2, md: 3 }}>
                <StatCard label="RetailPilot users seen" c={rows.length} sub="From allotment files and audits" />
                <StatCard label="Mapped" c={rows.length - unmapped.length} accent="green.400" />
                <StatCard label="Unmapped" c={unmapped.length} accent="red.400" sub="Their counts wait; nothing is paid until mapped" />
              </StatGrid>
              <Section title="Unmapped RetailPilot users" subtitle="The RetailPilot name comes from the allotment CSV. Pick the employee once.">
                <DataList
                  rows={unmapped} keyOf={(r) => r.rp_user_id}
                  columns={[
                    { key: "rp", label: "RetailPilot user", primary: true, render: (r) => <span>{r.rp_name || "—"} <Text as="span" fontFamily="mono" fontSize="xs" color="gray.500">{r.rp_user_id}</Text></span> },
                    { key: "store", label: "Store", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store || "—"}</Text> },
                    { key: "map", label: "Map to employee", render: (r) => can(P.MAPPING) ? (
                      <Flex gap={2} direction={{ base: "column", md: "row" }}>
                        <Select size="sm" h="40px" placeholder="Choose employee" value={pick[r.rp_user_id] || ""} onChange={(e) => setPick({ ...pick, [r.rp_user_id]: e.target.value })}>
                          {choices(r).map((e) => <option key={e.employee_id} value={e.employee_id}>{e.employee_name} · {e.designation || ""}</option>)}
                        </Select>
                        <Button size="sm" minH="38px" colorScheme="purple" isDisabled={isLive() && !pick[r.rp_user_id]} onClick={() => save(r, Number(pick[r.rp_user_id]))}>Save</Button>
                      </Flex>
                    ) : "—" },
                  ]}
                />
              </Section>
              <Section title="Mapped users">
                <DataList
                  rows={rows.filter((r) => r.mapped)} keyOf={(r) => r.rp_user_id}
                  columns={[
                    { key: "rp", label: "RetailPilot user", primary: true, render: (r) => <span>{r.rp_name || ""} <Text as="span" fontFamily="mono" fontSize="xs">{r.rp_user_id}</Text></span> },
                    { key: "emp", label: "Employee", primary: true, render: (r) => r.employee_name },
                    { key: "store", label: "Store", render: (r) => r.store || "—" },
                    { key: "designation", label: "Designation", render: (r) => r.designation || "—" },
                    { key: "unmap", label: "", render: (r) => (can(P.MAPPING) ? <Button size="xs" variant="ghost" colorScheme="red" onClick={() => save(r, null)}>Unmap</Button> : null) },
                  ]}
                />
              </Section>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

const RUN_COLOR = { SUCCESS: "green", FAILED: "red", DEFERRED: "orange", RUNNING: "purple" };

export function SyncReport() {
  const { can } = useStockAudit();
  const [tick, setTick] = useState(0);
  const s = useLoad(() => adapter.syncRuns(), [tick]);
  const start = async (kind) => (await act(() => adapter.startSync(kind), `${kind.replace("_", " ").toLowerCase()} sync started`)) && setTimeout(() => setTick((t) => t + 1), 3000);
  return (
    <Screen
      title="RetailPilot Synchronization & Exceptions"
      subtitle="Runway SPECTRA, read-only: stock_audit_count_session, stock_audit_count_line, stock_ledgers. Manual runs only - no schedule is switched on."
      sampleNote="SAMPLE run history. Production synchronization stays DISABLED until RetailPilot confirms the audit tables are officially supported."
      actions={can(P.SYNC) ? (
        <>
          <Button size="sm" minH="38px" variant="outline" colorScheme="purple" onClick={() => start("DRY_RUN")}>Dry run</Button>
          <Button size="sm" minH="38px" variant="outline" colorScheme="purple" onClick={() => start("HISTORICAL")}>Historical import (from 25 Nov)</Button>
          <Button size="sm" minH="38px" colorScheme="purple" onClick={() => start("INCREMENTAL")}>Sync now</Button>
        </>
      ) : null}
    >
      <Loader s={s}>
        {(d) => (
          <>
            <StatGrid cols={{ base: 2, md: 4 }}>
              <StatCard label="Last successful sync" c={fmtDateTime(d.last_success)} kind="raw" />
              <StatCard label="Schedule" c={d.schedule || "Not scheduled (manual only)"} kind="raw" sub={d.running ? "A run is in progress" : null} />
              <StatCard label="Historical import from" c={fmtDateTime(PROGRAMME_START)} kind="raw" />
              <StatCard label="Open exceptions" c={d.issues.length} accent={BRAND.orange} />
            </StatGrid>
            <Section title="Runs" subtitle="A failed or deferred run never moves the watermark; the next run repeats the window.">
              <DataList
                rows={d.runs} keyOf={(r) => r.run_id}
                renderDetail={(r) => <Text fontSize="xs" fontFamily="mono" whiteSpace="pre-wrap">{JSON.stringify(r.counts || {}, null, 1)}</Text>}
                columns={[
                  { key: "run", label: "Run", primary: true, render: (r) => `#${r.run_id} · ${r.kind.replace("_", " ").toLowerCase()}` },
                  { key: "at", label: "Started", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{fmtDateTime(r.started_at)} · {r.trigger}</Text> },
                  { key: "status", label: "Status", mobileRight: true, render: (r) => <Badge colorScheme={RUN_COLOR[r.status]}>{r.status.toLowerCase()}</Badge> },
                  { key: "read", label: "Sessions read", numeric: true, render: (r) => (r.counts && r.counts.session ? fmtNum(r.counts.session.read) : "—") },
                  { key: "issues", label: "Exceptions", numeric: true, render: (r) => r.issues },
                  { key: "error", label: "Note", render: (r) => <Text as="span" fontSize="xs">{r.error || (r.resume_after ? `Resume after ${fmtDateTime(r.resume_after)}` : "—")}</Text> },
                ]}
              />
            </Section>
            <Section title="Exceptions">
              <DataList
                rows={d.issues} keyOf={(r, i) => i}
                columns={[
                  { key: "kind", label: "Type", primary: true, render: (r) => <Pill color={/UNMAPPED/.test(r.kind) ? "red" : "gray"}>{r.kind.replace(/_/g, " ").toLowerCase()}</Pill> },
                  { key: "ref", label: "Reference", render: (r) => <Text as="span" fontFamily="mono" fontSize="xs">{r.ref}</Text> },
                  { key: "detail", label: "Detail", primary: true, render: (r) => <Text as="span" fontSize="sm">{r.detail}</Text> },
                ]}
              />
            </Section>
          </>
        )}
      </Loader>
    </Screen>
  );
}

export function PolicySettings() {
  const { can } = useStockAudit();
  const v = useLoad(() => adapter.policyVersions(), []);
  const [verdict, setVerdict] = useState("earliest_resolved");
  return (
    <Screen title="Incentive Policy Settings" subtitle="Confirmed amounts are locked. Scoring thresholds and methods are versioned and need approval before live processing.">
      <Section title="Confirmed (locked) · 27 Nov 2026">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <Text fontWeight={600} mb={1}>Employee (per unique article)</Text>
            {EMPLOYEE_SLABS.map((s) => <KV key={s.minAccuracyPct} k={`${s.minAccuracyPct}% and above`} v={`₹${s.rate.toFixed(2)}`} />)}
            <KV k="Below 95%" v="Nil" />
            <KV k="Minimum independent random recount" v="5% of unique audited articles, rounded up" />
            <KV k="Programme start" v="25 Nov 2026, 00:00 IST (original audit time)" />
          </Box>
          <Box>
            {["SUPERVISOR", "STORE_MANAGER"].map((role) => (
              <Box key={role} mb={3}>
                <Text fontWeight={600} mb={1}>{MANAGEMENT[role].title} · max ₹{fmtNum(MANAGEMENT[role].max)} per store</Text>
                {MANAGEMENT[role].components.map((c) => <KV key={c.key} k={c.label} v={`₹${fmtNum(c.max)}`} />)}
              </Box>
            ))}
            <Text fontWeight={600} mb={1}>Operations Manager · max ₹2,000 (₹400 a store)</Text>
            {MANAGEMENT.OPERATIONS_MANAGER.slabs.map((s) => <KV key={s.minScorePct} k={`Store ${s.minScorePct}% and above`} v={`₹${s.amount}`} />)}
            <KV k="Below 90% · or no independent verification" v="Nil" />
          </Box>
        </SimpleGrid>
      </Section>
      <Section title="Scoring layer (draft v2 · for your review)" actions={can(P.POLICY) ? <PreviewButton colorScheme="purple" label="Save draft">Save draft</PreviewButton> : null}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} fontSize="sm">
          <Box><Text fontSize="xs" mb={1}>Recount verdict when recounted more than once</Text>
            <Select size="sm" h="40px" value={verdict} onChange={(e) => setVerdict(e.target.value)}>
              <option value="earliest_resolved">Earliest resolved recount decides</option>
              <option value="any_mismatch">Any resolved mismatch decides</option>
            </Select>
          </Box>
          <Box><Text fontSize="xs" mb={1}>Movement ambiguity window (seconds)</Text><NumberInput size="sm" defaultValue={120} min={0}><NumberInputField h="40px" /></NumberInput></Box>
          <Box><Text fontSize="xs" mb={1}>Match tolerance (units)</Text><NumberInput size="sm" defaultValue={0} min={0} step={0.001}><NumberInputField h="40px" /></NumberInput></Box>
          <Box><Text fontSize="xs" mb={1}>Supervisor accuracy threshold (%)</Text><NumberInput size="sm" defaultValue={97}><NumberInputField h="40px" /></NumberInput></Box>
          <Box><Text fontSize="xs" mb={1}>Partial management payout</Text>
            <Select size="sm" h="40px" defaultValue="threshold"><option value="threshold">All or nothing per KPI (threshold)</option><option value="linear">Proportional to achievement</option><option value="slabs">Slabs</option></Select>
          </Box>
          <Box><Text fontSize="xs" mb={1}>Managers' personal article incentive</Text>
            <Select size="sm" h="40px" defaultValue="pending"><option value="pending">Pending your decision</option><option value="both">Both personal and management</option><option value="mgmt">Management incentive only</option></Select>
          </Box>
        </SimpleGrid>
      </Section>
      <Section title="Versions">
        <Loader s={v}>
          {(rows) => (
            <DataList rows={rows} keyOf={(r) => r.version} columns={[
              { key: "v", label: "Version", primary: true, render: (r) => `v${r.version}` },
              { key: "note", label: "Note", primary: true, render: (r) => <Text as="span" fontSize="xs">{r.note}</Text> },
              { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color="orange">{r.status.toLowerCase()}</Pill> },
              { key: "by", label: "Created", render: (r) => `${r.created} · ${r.by}` },
              { key: "act", label: "", render: () => (can(P.APPROVE) ? <PreviewButton size="xs" colorScheme="purple" label="Approve policy (not by its author)">Approve</PreviewButton> : null) },
            ]} />
          )}
        </Loader>
      </Section>
    </Screen>
  );
}
