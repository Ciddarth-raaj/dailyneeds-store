import React, { useState } from "react";
import { Badge, Box, Button, Checkbox, Flex, Input, NumberInput, NumberInputField, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad, D } from "../data/adapter";
import { EMPLOYEE_SLABS, MANAGEMENT, PROGRAMME_START } from "../data/calc";
import { DataList, KV, Pill, PreviewButton, Section, StatCard, StatGrid, BRAND, fmtDate, fmtDateTime, fmtNum } from "../ui";
import { Screen, Loader } from "./common";
import { P } from "../permissions";

export function CycleMaster() {
  const { can } = useStockAudit();
  const c = D.CYCLES[0];
  return (
    <Screen title="Audit Cycle Master" subtitle="Audit cycles per period and the branches taking part. Programme start: 25 Nov 2026, 00:00 IST.">
      <Section title="Cycles" actions={can(P.CYCLES) ? <PreviewButton colorScheme="purple" label="New cycle">New cycle</PreviewButton> : null}>
        <DataList
          rows={D.CYCLES} keyOf={(r) => r.cycle_id}
          columns={[
            { key: "name", label: "Cycle", primary: true },
            { key: "period", label: "Period", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.period_code}</Text> },
            { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color="green">{r.status.toLowerCase()}</Pill> },
            { key: "start", label: "Start", render: (r) => fmtDate(r.start_date) },
            { key: "deadline", label: "Audit deadline", render: (r) => fmtDate(r.deadline) },
            { key: "end", label: "End", render: (r) => fmtDate(r.end_date) },
            { key: "stores", label: "Branches", render: (r) => `${r.stores.length} retail stores` },
          ]}
        />
      </Section>
      <Section title={`Edit · ${c.name}`} subtitle="Preview form - nothing is saved">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <Box><Text fontSize="xs" mb={1}>Name</Text><Input size="sm" h="40px" defaultValue={c.name} /></Box>
          <Box><Text fontSize="xs" mb={1}>Period code</Text><Input size="sm" h="40px" defaultValue={c.period_code} /></Box>
          <Box><Text fontSize="xs" mb={1}>Audit deadline</Text><Input size="sm" h="40px" type="date" defaultValue={c.deadline} /></Box>
          <Box><Text fontSize="xs" mb={1}>Start</Text><Input size="sm" h="40px" type="date" defaultValue={c.start_date} /></Box>
          <Box><Text fontSize="xs" mb={1}>End</Text><Input size="sm" h="40px" type="date" defaultValue={c.end_date} /></Box>
        </SimpleGrid>
        <Text fontSize="xs" mt={4} mb={1} color="gray.600">Participating branches</Text>
        <SimpleGrid columns={{ base: 2, md: 6 }} spacing={2}>
          {D.STORES.map((s) => <Checkbox key={s.outlet_id} defaultChecked colorScheme="purple">{s.name}</Checkbox>)}
          <Checkbox isDisabled>Warehouse (excluded)</Checkbox>
        </SimpleGrid>
        <Flex mt={4} gap={2}><PreviewButton colorScheme="purple" label="Save cycle">Save</PreviewButton></Flex>
      </Section>
    </Screen>
  );
}

export function EmployeeMapping() {
  const { dataState } = useStockAudit();
  const emps = D.employees();
  const unmapped = emps.filter((e) => !e.employee_id);
  return (
    <Screen title="RetailPilot Employee Mapping" subtitle="Maps RetailPilot (Keypoint) user IDs to DNDS employees. Reuses the existing RetailPilot staff map (wh_rp_staff_map) - one map for the warehouse and the stores.">
      <StatGrid cols={{ base: 2, md: 4 }}>
        <StatCard label="RetailPilot auditors" c={emps.length} />
        <StatCard label="Mapped" c={emps.length - unmapped.length} accent="green.400" />
        <StatCard label="Unmapped" c={unmapped.length} accent="red.400" sub="Their counts wait; nothing is paid until mapped" />
        <StatCard label="Counts by unmapped users" c={unmapped.reduce((t, e) => t + e.audited, 0)} />
      </StatGrid>
      <Section title="Unmapped RetailPilot users" subtitle="RetailPilot name comes from MOSAIC report 6 (name resolution); pick the employee once.">
        <DataList
          rows={unmapped} keyOf={(r) => r.rp_user_id}
          columns={[
            { key: "rp", label: "RetailPilot user", primary: true, render: (r) => <span>{r.rp_name} <Text as="span" fontFamily="mono" fontSize="xs" color="gray.500">{r.rp_user_id}</Text></span> },
            { key: "store", label: "Counted at", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store} · {fmtNum(r.audited)} counts</Text> },
            { key: "map", label: "Map to employee", render: (r) => (
              <Flex gap={2} direction={{ base: "column", md: "row" }}>
                <Select size="sm" h="40px" placeholder="Choose employee">{emps.filter((e) => e.employee_id && e.outlet_id === r.outlet_id).slice(0, 8).map((e) => <option key={e.employee_id}>{e.name} · {e.code}</option>)}</Select>
                <PreviewButton colorScheme="purple" label="Save mapping">Save</PreviewButton>
              </Flex>
            ) },
          ]}
        />
      </Section>
      <Section title="Mapped users (sample)">
        <DataList
          rows={emps.filter((e) => e.employee_id).slice(0, 12)} keyOf={(r) => r.rp_user_id}
          columns={[
            { key: "rp", label: "RetailPilot user", primary: true, render: (r) => <Text as="span" fontFamily="mono" fontSize="xs">{r.rp_user_id}</Text> },
            { key: "emp", label: "Employee", primary: true, render: (r) => `${r.name} · ${r.code}` },
            { key: "store", label: "Branch", render: (r) => r.store },
            { key: "designation", label: "Designation", render: (r) => r.designation },
          ]}
        />
      </Section>
    </Screen>
  );
}

const RUN_COLOR = { SUCCESS: "green", FAILED: "red", DEFERRED: "orange", RUNNING: "purple" };

export function SyncReport() {
  const { can } = useStockAudit();
  const s = useLoad(() => adapter.syncRuns(), []);
  return (
    <Screen
      title="RetailPilot Synchronization & Exceptions"
      subtitle="Runway SPECTRA: stock_audit_count_session, stock_audit_count_line, stock_ledgers. Every 15 minutes once enabled."
      sampleNote="SAMPLE run history. Production synchronization stays DISABLED until RetailPilot confirms the audit tables are officially supported."
      actions={can(P.SYNC) ? (
        <>
          <PreviewButton variant="outline" colorScheme="purple" label="Dry run">Dry run</PreviewButton>
          <Button size="sm" minH="38px" colorScheme="purple" isDisabled title="Disabled until RetailPilot confirms the tables">Sync now</Button>
        </>
      ) : null}
    >
      <Loader s={s}>
        {(d) => (
          <>
            <StatGrid cols={{ base: 2, md: 4 }}>
              <StatCard label="Last successful sync" c={fmtDateTime(d.last_success)} kind="raw" />
              <StatCard label="Schedule" c="Every 15 min (disabled)" kind="raw" />
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
          <Box><Text fontSize="xs" mb={1}>Variance closure window (days)</Text><NumberInput size="sm" defaultValue={7}><NumberInputField h="40px" /></NumberInput></Box>
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
