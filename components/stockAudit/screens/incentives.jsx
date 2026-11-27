import React, { useState } from "react";
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad, D } from "../data/adapter";
import { known, MANAGEMENT, EMPLOYEE_SLABS } from "../data/calc";
import { Cell, DataList, FilterBar, KV, Pill, PreviewButton, Progress, Section, SelectField, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtPct } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, useScope, NoAccess } from "./common";
import { P } from "../permissions";

const STATUS_LABEL = {
  CALCULATED: ["green", "Calculated"],
  PENDING_VERIFICATION: ["orange", "Pending verification"],
  INSUFFICIENT_SAMPLE: ["orange", "Sample below 5%"],
  PENDING_ELIGIBILITY_REVIEW: ["purple", "Eligibility review"],
  NOT_APPLICABLE: ["gray", "Not applicable"],
};
const StatusBadge = ({ s }) => <Badge colorScheme={(STATUS_LABEL[s] || ["gray"])[0]} textTransform="none">{(STATUS_LABEL[s] || [null, s])[1]}</Badge>;

export function EmployeeIncentives() {
  const { dataState, can } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(scope ? String(scope[0]) : "");
  const [page, setPage] = useState(1);
  const s = useLoad(() => adapter.employees({ state: dataState, outlets: outlet ? [Number(outlet)] : scope, page, size: 15 }), [dataState, outlet, page]);
  if (!can(P.STORE)) return <Screen title="Employee Incentive Calculation"><NoAccess what="other employees' incentives" /></Screen>;
  return (
    <Screen title="Employee Incentive Calculation" subtitle="Eligible unique articles × slab rate. Every figure stays an estimate until verified and approved.">
      <Section>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2} fontSize="sm">
          {EMPLOYEE_SLABS.map((x) => <Box key={x.minAccuracyPct} p={2} bg="purple.50" borderRadius="md"><b>₹{x.rate.toFixed(2)}</b> / article<br /><Text as="span" fontSize="xs">{x.minAccuracyPct}%+ accuracy</Text></Box>)}
          <Box p={2} bg="gray.50" borderRadius="md"><b>Nil</b><br /><Text as="span" fontSize="xs">below 95%</Text></Box>
        </SimpleGrid>
      </Section>
      <FilterBar><StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} /><CycleSelect /></FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage} keyOf={(r) => r.rp_user_id}
            renderDetail={(r) => (
              <Box maxW="480px" fontSize="sm">
                <KV k="Unique articles audited" v={fmtNum(r.audited)} />
                <KV k="Recount sample (5%, rounded up)" v={`${r.sample.verified} verified of ${r.sample.required} required`} />
                <KV k="Correct recounts" v={`${r.sample.matched} of ${r.sample.verified}`} />
                <KV k="Accuracy (not rounded before the slab)" v={<Cell c={r.accuracy} kind="pct" />} />
                <KV k="Rate" v={<Cell c={r.rate} kind="money" />} />
                <KV k="Estimated incentive" v={<Cell c={r.estimated} kind="money" showReason />} />
                {r.provisional != null ? <KV k="If eligibility is confirmed" v={fmtMoney(r.provisional)} /> : null}
              </Box>
            )}
            columns={[
              { key: "name", label: "Employee", primary: true, render: (r) => r.name || r.rp_name },
              { key: "store", label: "Branch", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store} · {r.designation}</Text> },
              { key: "est", label: "Estimated", numeric: true, mobileRight: true, render: (r) => <Cell c={r.estimated} kind="money" /> },
              { key: "audited", label: "Articles", numeric: true, render: (r) => fmtNum(r.audited) },
              { key: "sample", label: "Sample", numeric: true, render: (r) => `${r.sample.verified}/${r.sample.required}` },
              { key: "acc", label: "Accuracy", numeric: true, render: (r) => <Cell c={r.accuracy} kind="pct" /> },
              { key: "rate", label: "Rate", numeric: true, render: (r) => <Cell c={r.rate} kind="money" /> },
              { key: "status", label: "Status", render: (r) => <StatusBadge s={r.calc_status} /> },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

function KpiCard({ store, person, role }) {
  const r = MANAGEMENT[role];
  return (
    <Section title={`${store.name} · ${person.name}`} subtitle={`${r.title} · max ₹${fmtNum(r.max)}`}>
      <Stack spacing={2}>
        {person.components.map((c) => (
          <Box key={c.key} p={2} border="1px solid" borderColor="gray.100" borderRadius="md">
            <Flex justify="space-between" fontSize="sm" gap={2}>
              <Text>{c.label}</Text>
              <Text whiteSpace="nowrap"><Cell c={c.amount} kind="money" /> / ₹{c.max}</Text>
            </Flex>
            <Flex justify="space-between" fontSize="xs" color="gray.500" mt={1}><Text>Measured</Text><Cell c={c.measure} kind="pct" showReason /></Flex>
          </Box>
        ))}
      </Stack>
      <Flex justify="space-between" mt={3} fontWeight={700}>
        <Text>Total</Text>
        <Box textAlign="right"><Cell c={person.amount} kind="money" showReason /><Text fontSize="xs" color="gray.500" fontWeight={400}>decided so far ₹{fmtNum(person.decidedAmount)}</Text></Box>
      </Flex>
    </Section>
  );
}

function RoleKpis({ role, field, title }) {
  const { dataState } = useStockAudit();
  const scope = useScope();
  const s = useLoad(() => adapter.management({ state: dataState }), [dataState]);
  return (
    <Screen title={title} subtitle="Thresholds are draft (policy v2). KPIs that cannot be measured yet stay Pending or Unavailable - never zero, never full.">
      <FilterBar><CycleSelect /></FilterBar>
      <Loader s={s}>
        {(rows) => (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3}>
            {rows.filter((m) => !scope || scope.includes(m.store.outlet_id)).map((m) => <KpiCard key={m.store.outlet_id} store={m.store} person={m[field]} role={role} />)}
          </SimpleGrid>
        )}
      </Loader>
    </Screen>
  );
}

export const SupervisorKpi = () => <RoleKpis role="SUPERVISOR" field="supervisor" title="Supervisor KPI & Incentive" />;
export const StoreManagerKpi = () => <RoleKpis role="STORE_MANAGER" field="storeManager" title="Store Manager KPI & Incentive" />;

export function OperationsManagerKpi() {
  const { dataState, can } = useStockAudit();
  const s = useLoad(() => adapter.management({ state: dataState }), [dataState]);
  if (!can(P.COMPANY)) return <Screen title="Operations Manager KPI & Incentive"><NoAccess what="the Operations Manager incentive" /></Screen>;
  return (
    <Screen title="Operations Manager KPI & Incentive" subtitle="Per store: Store Manager weighted KPI score → ₹400 / ₹300 / ₹200 / nil. Nil without independent verification. Max ₹2,000.">
      <Loader s={s}>
        {(rows) => {
          const decided = rows.filter((m) => known(m.om));
          const sum = decided.reduce((t, m) => t + m.om.value, 0);
          return (
            <>
              <StatGrid cols={{ base: 2, md: 3 }}>
                <StatCard label="Decided stores" c={`${decided.length} of ${rows.length}`} kind="raw" />
                <StatCard label="Decided amount" c={sum} kind="money" />
                <StatCard label="Total" c={decided.length === rows.length ? { status: "AVAILABLE", value: Math.min(sum, 2000) } : { status: "PENDING", value: null, reason: "COMPONENT_PENDING" }} kind="money" />
              </StatGrid>
              <DataList rows={rows} keyOf={(m) => m.store.outlet_id} columns={[
                { key: "store", label: "Store", primary: true, render: (m) => m.store.name },
                { key: "amount", label: "Incentive", numeric: true, mobileRight: true, render: (m) => <Cell c={m.om} kind="money" showReason /> },
                { key: "score", label: "Store Manager score", numeric: true, render: (m) => <Cell c={m.storeManager.weightedScore} kind="pct" showReason /> },
                { key: "iv", label: "Independent verification", render: (m) => (m.store.independent_verification === true ? <Pill color="green">done</Pill> : <Pill color="orange">pending</Pill>) },
              ]} />
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

export function CalculationPreview() {
  const { dataState, can } = useStockAudit();
  const st = useLoad(() => adapter.stores({ state: dataState }), [dataState]);
  const m = useLoad(() => adapter.management({ state: dataState }), [dataState]);
  return (
    <Screen
      title="Incentive Calculation Preview"
      subtitle="What a calculation run would produce right now. Live calculation and payment are DISABLED."
      actions={can(P.CALCULATE) ? <Button size="sm" minH="38px" colorScheme="purple" isDisabled title="Live calculation disabled until data and rules are validated">Calculate (disabled)</Button> : null}
    >
      <Loader s={st}>
        {(stores) => {
          const emps = stores.flatMap((x) => x.employees);
          const by = (k) => emps.filter((e) => e.calc_status === k).length;
          const calc = emps.filter((e) => known(e.estimated));
          const mg = m.data || [];
          return (
            <>
              <StatGrid cols={{ base: 2, md: 3, lg: 6 }}>
                <StatCard label="Employees" c={emps.length} />
                <StatCard label="Calculated" c={by("CALCULATED")} accent="green.400" />
                <StatCard label="Pending verification" c={by("PENDING_VERIFICATION")} accent={BRAND.orange} />
                <StatCard label="Sample below 5%" c={by("INSUFFICIENT_SAMPLE")} accent={BRAND.orange} />
                <StatCard label="Eligibility review" c={by("PENDING_ELIGIBILITY_REVIEW")} />
                <StatCard label="Employee estimate (calculated only)" c={calc.reduce((t, e) => t + e.estimated.value, 0)} kind="money" />
              </StatGrid>
              <Section title="Budget view" subtitle="Indicative maximums for one complete cycle and one SAPL prize - not caps">
                <KV k="Employee incentives (decided)" v={fmtMoney(calc.reduce((t, e) => t + e.estimated.value, 0))} />
                <KV k="Supervisors (decided KPIs)" v={fmtMoney(mg.reduce((t, x) => t + x.supervisor.decidedAmount, 0))} />
                <KV k="Store Managers (decided KPIs)" v={fmtMoney(mg.reduce((t, x) => t + x.storeManager.decidedAmount, 0))} />
                <KV k="Operations Manager (decided stores)" v={fmtMoney(mg.filter((x) => known(x.om)).reduce((t, x) => t + x.om.value, 0))} />
                <KV k="SAPL winning store prize" v={<Cell c={{ status: "PENDING", reason: "NOT_APPROVED" }} kind="money" showReason />} />
                <KV k="Maximum estimate (75,000 articles, full KPIs, one prize)" v="₹1,07,000" />
              </Section>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

const CHAIN = [
  ["Employee", "Supervisor review → Store Manager approval"],
  ["Supervisor", "Store Manager"],
  ["Store Manager", "Operations Manager"],
  ["Operations Manager", "Management"],
  ["SAPL prize", "Management"],
];

export function Approvals() {
  const { dataState, viewer, can } = useStockAudit();
  const s = useLoad(() => adapter.approvals({ state: dataState }), [dataState]);
  return (
    <Screen title="Incentive Approval" subtitle="Only approved incentives can reach payroll. Nobody approves their own incentive. A changed amount needs reapproval.">
      <Section title="Approval chain">
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={2}>
          {CHAIN.map(([who, by]) => <Box key={who} p={2} bg="purple.50" borderRadius="md" fontSize="sm"><b>{who}</b><br /><Text as="span" fontSize="xs">{by}</Text></Box>)}
        </SimpleGrid>
      </Section>
      <Loader s={s}>
        {(rows) => (
          <DataList
            rows={rows.filter((r) => !viewer.outlets || D.STORES.some((x) => viewer.outlets.includes(x.outlet_id) && x.name === r.store))}
            keyOf={(r) => r.id}
            renderDetail={(r) => {
              const own = viewer.id === "sm" && r.type === "Store Manager incentive" && r.store === "ECR";
              return (
                <Stack direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
                  {own ? <Text fontSize="sm" color="red.600">This is your own incentive: you cannot approve it.</Text> : null}
                  <PreviewButton colorScheme="green" label="Approve" isDisabled={own || !can(P.APPROVE) || !known(r.amount)}>Approve</PreviewButton>
                  <PreviewButton colorScheme="red" variant="outline" label="Reject" isDisabled={own || !can(P.APPROVE)}>Reject</PreviewButton>
                  {!known(r.amount) ? <Text fontSize="xs" color="gray.500">Cannot be approved while the amount is pending.</Text> : null}
                </Stack>
              );
            }}
            columns={[
              { key: "recipient", label: "Recipient", primary: true },
              { key: "type", label: "Type", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.type} · {r.store}</Text> },
              { key: "amount", label: "Amount", numeric: true, mobileRight: true, render: (r) => <Cell c={r.amount} kind="money" /> },
              { key: "stage", label: "Waiting for", render: (r) => <Pill color="orange">{r.stage}</Pill> },
              { key: "next", label: "Then", render: (r) => r.next },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

export function IncentiveHistory() {
  const rows = [
    { at: "2026-11-27 10:30", what: "Policy v2 drafted (scoring thresholds for review)", by: "Stock Audit admin", ref: "policy v2" },
    { at: "2026-11-27 09:05", what: "Preview calculation · Q4 2026 Full Audit · no records created", by: "Stock Audit admin", ref: "cycle 101" },
    { at: "2026-11-27 09:00", what: "Confirmed amounts recorded: ₹1.10 / ₹1.00 / ₹0.50; ₹1,000 / ₹1,500 / ₹2,000", by: "Management", ref: "policy v1" },
  ];
  return (
    <Screen title="Incentive History" subtitle="Every calculation, approval, revocation and payroll hand-over, with its audit cycle and policy version.">
      <DataList rows={rows} keyOf={(r) => r.at} columns={[
        { key: "what", label: "Event", primary: true },
        { key: "at", label: "When", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.at} · {r.by}</Text> },
        { key: "ref", label: "Reference", mobileRight: true, render: (r) => <Pill>{r.ref}</Pill> },
      ]} />
      <Text fontSize="xs" color="gray.500" mt={3}>No incentive has been approved, revoked or sent to payroll: live processing is disabled.</Text>
    </Screen>
  );
}
