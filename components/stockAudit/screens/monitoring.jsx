import React, { useState } from "react";
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad, D, isLive } from "../data/adapter";
import { available, pending, known, unavailable, ESTIMATE_BASIS_LABEL } from "../data/calc";
import { EstimateBreakdown } from "./incentives";
import { Cell, DataList, FilterBar, KV, Pill, Progress, SearchField, Section, SelectField, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtDateTime, fmtDate } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, Freshness, useScope, NoAccess, useNav } from "./common";
import { P } from "../permissions";

const total = (list, f) => list.reduce((t, x) => t + f(x), 0);
const sumCell = (list, k) => (list.every((s) => known(s[k])) ? available(total(list, (s) => s[k].value)) : list.find((s) => !known(s[k]))[k]);

export function CompanyDashboard() {
  const { dataState, go, can } = useStockAudit();
  const scope = useScope();
  const s = useLoad(() => adapter.stores({ state: dataState, outlets: scope }), [dataState, scope]);
  const m = useLoad(() => adapter.management({ state: dataState }), [dataState]);
  const nav = useNav();
  if (!can(P.COMPANY)) return <Screen title="Company-wide Stock Audit Dashboard"><NoAccess what="the company-wide dashboard" /></Screen>;
  return (
    <Screen title="Company-wide Stock Audit Dashboard" subtitle="Q4 2026 Full Audit · five retail stores (warehouse excluded)" actions={<Freshness />}>
      <FilterBar>
        <CycleSelect />
        <SelectField label="Category" value="" onChange={() => {}} options={[{ value: "", label: "All categories" }, { value: "f", label: "Foodgrains, Oils & Masala" }, { value: "b", label: "Beverages" }]} />
        <SelectField label="Date" value="today" onChange={() => {}} options={[{ value: "today", label: "Today" }, { value: "cycle", label: "Whole cycle" }]} />
      </FilterBar>
      <Loader s={s}>
        {(stores) => {
          const audited = total(stores, (x) => x.audited);
          const verified = total(stores, (x) => x.recount_done);
          const required = total(stores, (x) => x.recount_required);
          const matchedPctCell = verified ? available(total(stores, (x) => (known(x.accuracy) ? (x.accuracy.value * x.recount_done) / 100 : 0)) * 100 / verified) : pending("PENDING_VERIFICATION");
          const allotted = sumCell(stores, "allotted");
          const mgmt = m.data || [];
          const mgmtDecided = total(mgmt, (x) => x.supervisor.decidedAmount + x.storeManager.decidedAmount);
          return (
            <>
              <StatGrid cols={{ base: 2, md: 3, lg: 5 }}>
                <StatCard label="Participating stores" c={stores.length} sub="Warehouse excluded" onClick={nav("store")} />
                <StatCard label="Eligible employees" c={stores.every((x) => x.eligible_employees != null) ? total(stores, (x) => x.eligible_employees) : { status: "UNAVAILABLE", reason: "HEADCOUNT_UNAVAILABLE" }} sub="Active counting staff of the stores" onClick={nav("eligibility")} />
                <StatCard label="Employees participating" c={stores.every((x) => x.eligible_employees != null) ? total(stores, (x) => x.participating) : { status: "UNAVAILABLE", reason: "HEADCOUNT_UNAVAILABLE" }} sub="Eligible staff who counted" onClick={nav("eligibility")} />
                <StatCard label="Articles allotted" c={allotted} onClick={nav("allotment")} />
                <StatCard label="Audited today" c={total(stores, (x) => x.audited_today)} accent={BRAND.orange} onClick={nav("employees")} />
                <StatCard label="Total audited" c={audited} onClick={nav("articles")} />
                <StatCard label="Pending articles" c={known(allotted) ? available(allotted.value - audited) : allotted} onClick={nav("allotment")} />
                <StatCard label="Completion" kind="pct" c={known(allotted) ? available((audited * 100) / allotted.value) : allotted} onClick={nav("allotment")} />
                <StatCard label="Recounts" c={verified} sub={`of ${fmtNum(required)} required (5%)`} onClick={nav("verification")} />
                <StatCard label="Counting accuracy" kind="pct" c={matchedPctCell} accent={BRAND.orange} onClick={nav("verification")} />
              </StatGrid>
              <StatGrid cols={{ base: 2, md: 4 }}>
                <StatCard label="Shortage (review only)" c={total(stores, (x) => x.shortage_value)} kind="money" sub={`${fmtNum(total(stores, (x) => x.shortage_qty))} units`} accent="red.400" onClick={nav("variance")} />
                <StatCard label="Excess (review only)" c={total(stores, (x) => x.excess_value)} kind="money" sub={`${fmtNum(total(stores, (x) => x.excess_qty))} units`} accent="green.400" onClick={nav("variance")} />
                <StatCard label="Net variance (review only)" c={total(stores, (x) => x.excess_value - x.shortage_value)} kind="money" sub="Not used for incentives or rankings" onClick={nav("variance")} />
                <StatCard label="Estimated employee incentives" c={total(stores, (x) => x.estimate_employee)} kind="money" sub={`Calculated so far ${fmtMoney(total(stores, (x) => x.estimated_employee))} · ${total(stores, (x) => x.estimate_employee_none)} without recounts`} onClick={nav("incentives")} />
                <StatCard label="Estimated management incentives" c={mgmtDecided} kind="money" sub="Decided KPIs only; others pending" onClick={nav("store-manager") || nav("supervisor")} />
                <StatCard label="Approved incentives" c={pending("NOT_APPROVED")} kind="money" onClick={nav("approvals") || nav("incentive-history")} />
                <StatCard label="Payroll-processed" c={pending("NOT_APPROVED")} kind="money" onClick={nav("incentive-history")} />
                <StatCard label="SAPL prize" c={10000} kind="money" sub="Separate team incentive" accent="yellow.400" onClick={nav("sapl")} />
              </StatGrid>
              <Section title="Stores" subtitle="Tap a store to drill down: Store → Employee → Article → Audit history">
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                  {stores.map((st) => (
                    <Box key={st.outlet_id} border="1px solid" borderColor="gray.100" borderRadius="lg" p={3} cursor="pointer" _hover={{ boxShadow: "md" }} onClick={() => go("store", { outlet: st.outlet_id })}>
                      <Flex justify="space-between" mb={2}><Heading size="sm">{st.name}</Heading><Pill>{st.eligible_employees == null ? "headcount n/a" : `${st.participating}/${st.eligible_employees} counting`}</Pill></Flex>
                      <Progress c={st.completion} label="Completion" />
                      <Box h={2} />
                      <Progress c={st.recount_progress} label="Recounts (of 5% required)" color={BRAND.orange} />
                      <SimpleGrid columns={3} mt={3} fontSize="xs" spacing={1}>
                        <Box><Text color="gray.500">Audited</Text><Text fontWeight={600}>{fmtNum(st.audited)}</Text></Box>
                        <Box><Text color="gray.500">Today</Text><Text fontWeight={600}>{fmtNum(st.audited_today)}</Text></Box>
                        <Box><Text color="gray.500">Accuracy</Text><Cell c={st.accuracy} kind="pct" /></Box>
                      </SimpleGrid>
                    </Box>
                  ))}
                </SimpleGrid>
              </Section>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

export function StoreDashboard() {
  const { dataState, go, params } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(String(params.outlet || (scope ? scope[0] : 7)));
  const s = useLoad(() => adapter.store({ state: dataState, outletId: outlet }), [dataState, outlet]);
  const nav = useNav();
  if (scope && !scope.includes(Number(outlet))) return <Screen title="Store Dashboard"><NoAccess what="this store" /></Screen>;
  return (
    <Screen title="Store-wise Stock Audit Dashboard" back={{ label: "Company dashboard", path: "company" }} actions={<Freshness />}>
      <FilterBar>
        <StoreSelect value={outlet} onChange={setOutlet} allowAll={false} />
        <CycleSelect />
      </FilterBar>
      <Loader s={s}>
        {(st) => (
          <>
            <StatGrid cols={{ base: 2, md: 3, lg: 6 }}>
              <StatCard label="Articles allotted" c={st.allotted} onClick={nav("allotment", { outlet: st.outlet_id })} />
              <StatCard label="Audited today" c={st.audited_today} accent={BRAND.orange} onClick={nav("employees", { outlet: st.outlet_id })} />
              <StatCard label="Total audited" c={st.audited} onClick={nav("employees", { outlet: st.outlet_id })} />
              <StatCard label="Pending" c={st.pending} onClick={nav("allotment", { outlet: st.outlet_id })} />
              <StatCard label="Completion" c={st.completion} kind="pct" onClick={nav("allotment", { outlet: st.outlet_id })} />
              <StatCard label="Accuracy" c={st.accuracy} kind="pct" accent={BRAND.orange} onClick={nav("verification", { outlet: st.outlet_id })} />
              <StatCard label="Recounts" c={st.recount_done} sub={`of ${fmtNum(st.recount_required)} required`} onClick={nav("verification", { outlet: st.outlet_id })} />
              <StatCard label="Shortage value" c={st.shortage_value} kind="money" accent="red.400" onClick={nav("variance", { outlet: st.outlet_id })} />
              <StatCard label="Excess value" c={st.excess_value} kind="money" accent="green.400" onClick={nav("variance", { outlet: st.outlet_id })} />
              <StatCard label="Recount progress" c={st.recount_progress} kind="pct" onClick={nav("verification", { outlet: st.outlet_id })} />
              <StatCard label="Employees participating" c={st.participation} kind="pct" sub={st.eligible_employees == null ? "Eligible headcount not available" : `${st.participating} of ${st.eligible_employees} eligible staff${st.participation_detail && !st.participation_detail.snapshot ? " · provisional (no snapshot yet)" : ""}`} onClick={nav("eligibility", { outlet: st.outlet_id })} />
              <StatCard label="Estimated employee incentives" c={st.estimate_employee} kind="money" sub={`Calculated so far ${fmtMoney(st.estimated_employee)} · ${st.estimate_employee_none} without recounts`} onClick={nav("incentives", { outlet: st.outlet_id })} />
            </StatGrid>
            <Section title="Employees" subtitle="Tap an employee for article-level details" actions={<Button size="sm" variant="outline" colorScheme="purple" onClick={() => go("employees", { outlet: st.outlet_id })}>Full employee report</Button>}>
              <DataList
                rows={st.employees.slice().sort((a, b) => b.audited - a.audited)}
                keyOf={(r) => r.rp_user_id}
                onRowClick={(r) => go("articles", { user: r.rp_user_id })}
                columns={[
                  { key: "name", label: "Employee", primary: true, render: (r) => r.name || <Text as="span">{r.rp_name} <Badge colorScheme="red" fontSize="0.6em">unmapped</Badge></Text> },
                  { key: "designation", label: "Designation", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.designation}</Text> },
                  { key: "audited", label: "Audited", numeric: true, mobileRight: true, render: (r) => <b>{fmtNum(r.audited)}</b> },
                  { key: "allotted", label: "Allotted", numeric: true, render: (r) => <Cell c={r.allotted_c} /> },
                  { key: "today", label: "Today", numeric: true, render: (r) => fmtNum(r.today) },
                  { key: "completion", label: "Completion", numeric: true, render: (r) => <Cell c={r.completion_c} kind="pct" /> },
                  { key: "recount", label: "Recounts", numeric: true, render: (r) => `${r.recount_done} / ${r.recount_required}` },
                  { key: "accuracy", label: "Accuracy", numeric: true, render: (r) => <Cell c={r.accuracy} kind="pct" /> },
                ]}
              />
            </Section>
          </>
        )}
      </Loader>
    </Screen>
  );
}

export function EmployeePerformance() {
  const { dataState, go, params } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(params.outlet ? String(params.outlet) : scope ? String(scope[0]) : "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const outlets = outlet ? [Number(outlet)] : scope;
  const s = useLoad(() => adapter.employees({ state: dataState, outlets, search, page, size: 15 }), [dataState, outlet, search, page]);
  return (
    <Screen title="Employee-wise Stock Audit Performance" subtitle="Allotment vs actual RetailPilot audits, recounts, accuracy and incentive" actions={<Freshness />}>
      <FilterBar>
        <StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} />
        <CycleSelect />
        <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name, employee ID or RetailPilot ID" />
      </FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage}
            keyOf={(r) => r.rp_user_id}
            renderDetail={(r) => <Button size="sm" colorScheme="purple" onClick={() => go("articles", { user: r.rp_user_id })}>Article-level details</Button>}
            columns={[
              { key: "code", label: "Employee ID", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.code || r.rp_user_id}</Text> },
              { key: "name", label: "Name", primary: true, render: (r) => r.name || <Text as="span">{r.rp_name} <Badge colorScheme="red" fontSize="0.6em">unmapped</Badge></Text> },
              { key: "designation", label: "Designation", render: (r) => r.designation },
              { key: "store", label: "Branch", render: (r) => r.store },
              { key: "allotted", label: "Allotted", numeric: true, render: (r) => <Cell c={r.allotted_c} /> },
              { key: "today", label: "Today", numeric: true, render: (r) => fmtNum(r.today) },
              { key: "audited", label: "Audited", numeric: true, mobileRight: true, render: (r) => <b>{fmtNum(r.audited)}</b> },
              { key: "pending", label: "Pending", numeric: true, render: (r) => <Cell c={r.pending_c} /> },
              { key: "completion", label: "Completion", numeric: true, render: (r) => <Cell c={r.completion_c} kind="pct" /> },
              { key: "deadline", label: "Within deadline", numeric: true, render: (r) => <Cell c={r.within_deadline_c} /> },
              { key: "req", label: "Recounts req.", numeric: true, render: (r) => fmtNum(r.recount_required) },
              { key: "done", label: "Recounts done", numeric: true, render: (r) => fmtNum(r.recount_done) },
              { key: "accuracy", label: "Accuracy", numeric: true, render: (r) => <Cell c={r.accuracy} kind="pct" /> },
              { key: "est", label: "Estimated", numeric: true, render: (r) => <Cell c={r.est.estimate} kind="money" /> },
              { key: "calc", label: "Calculated", numeric: true, render: (r) => <Cell c={r.estimated} kind="money" /> },
              { key: "appr", label: "Approved", numeric: true, render: (r) => <Cell c={r.approved_c} kind="money" /> },
              { key: "pay", label: "Payment", render: () => <Pill color="gray">Not started</Pill> },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

/** Individual employee view - bilingual labels, own data only. */
export function MyStockAudit() {
  const { dataState, go, viewer } = useStockAudit();
  const [which, setWhich] = useState(0);
  const s = useLoad(() => adapter.my({ state: dataState }), [dataState]);
  const mine = (e) => go("articles", { user: e.rp_user_id, self: 1 });
  return (
    <Screen title="My Stock Audit · என் ஸ்டாக் ஆடிட்" subtitle={isLive() || viewer.self ? "Only your own figures are shown" : "Shown here as one sample employee"} actions={<Freshness />}>
      <Loader s={s}>
        {(my) => !my.mapped || !my.employees.length ? (
          <Box p={6} bg="gray.50" borderRadius="md" fontSize="sm">Your RetailPilot user is not mapped to your employee record yet, so no audits can be shown. Please ask HR to map it (RetailPilot Employee Mapping).</Box>
        ) : (() => {
          const e = my.employees[Math.min(which, my.employees.length - 1)];
          return (
          <>
            {my.employees.length > 1 ? <FilterBar><SelectField label="Store" value={String(which)} onChange={(v) => setWhich(Number(v))} options={my.employees.map((x, i) => ({ value: String(i), label: x.store }))} /></FilterBar> : null}
            <Section>
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <Box><Heading size="md">{e.name}</Heading><Text fontSize="sm" color="gray.500">{e.designation} · {e.store} · {e.code}</Text></Box>
                <Pill color="orange">{e.calc_status.replace(/_/g, " ").toLowerCase()}</Pill>
              </Flex>
            </Section>
            <StatGrid cols={{ base: 2, md: 4 }}>
              <StatCard label="Articles allotted" tamil="ஒதுக்கப்பட்ட பொருட்கள்" c={e.allotted_c} />
              <StatCard label="Audited today" tamil="இன்று சரிபார்த்தவை" c={e.today} accent={BRAND.orange} onClick={() => mine(e)} />
              <StatCard label="Total audited" tamil="மொத்தம் சரிபார்த்தவை" c={e.audited} onClick={() => mine(e)} />
              <StatCard label="Pending" tamil="மீதமுள்ளவை" c={e.pending_c} />
              <StatCard label="Recounts" tamil="மறு எண்ணிக்கை" c={`${e.recount_done} / ${e.recount_required}`} kind="raw" sub="Done / required (5%)" onClick={() => mine(e)} />
              <StatCard label="Counting accuracy" tamil="எண்ணிக்கை துல்லியம்" c={e.accuracy} kind="pct" accent={BRAND.orange} onClick={() => mine(e)} />
              <StatCard label="Estimated incentive" tamil="மதிப்பிடப்பட்ட ஊக்கத்தொகை" c={e.est.estimate} kind="money" accent={BRAND.orange} sub={ESTIMATE_BASIS_LABEL[e.est.basis]} />
              <StatCard label="If full allotment audited" tamil="முழு ஒதுக்கீடு முடிந்தால்" c={e.est.projected} kind="money" sub="At your accuracy so far" />
              <StatCard label="Calculated incentive" tamil="கணக்கிடப்பட்ட ஊக்கத்தொகை" c={e.estimated} kind="money" sub={e.provisional != null ? `If eligibility is confirmed: ${fmtMoney(e.provisional)}` : "After the full 5% recount sample"} />
              <StatCard label="Approved incentive" tamil="அங்கீகரிக்கப்பட்ட ஊக்கத்தொகை" c={e.approved_c} kind="money" />
            </StatGrid>
            <Section><EstimateBreakdown r={e} tamil /></Section>
            <Section title="How your incentive works · ஊக்கத்தொகை எப்படி">
              <Stack fontSize="sm" spacing={1}>
                <Text>₹1.10 per article at 99% accuracy or more · ₹1.00 at 97% · ₹0.50 at 95% · nil below 95%.</Text>
                <Text>Accuracy comes only from independent recounts of your articles (at least 5%). A genuine shortage that the recount confirms is counted as correct.</Text>
                <Text>The estimate uses your recounts so far and can go up or down as more recounts come in. Only the approved amount is paid.</Text>
              </Stack>
              <Button mt={3} size="sm" colorScheme="purple" onClick={() => mine(e)}>My articles</Button>
            </Section>
          </>
          );
        })()}
      </Loader>
    </Screen>
  );
}

export function ArticleAuditDetails() {
  const { dataState, params } = useStockAudit();
  const self = Boolean(params.self);
  const user = params.user || (isLive() ? null : D.employees()[0].rp_user_id);
  const [page, setPage] = useState(1);
  const e = useLoad(
    () => (!user ? Promise.resolve(null) : self ? adapter.my({ state: dataState }).then((m) => (m.employees || []).find((x) => x.rp_user_id === user) || null) : adapter.employee({ state: dataState, rpUserId: user })),
    [dataState, user, self]
  );
  const a = useLoad(() => (user ? adapter.articles({ state: dataState, rpUserId: user, page, size: 20, self }) : Promise.resolve({ rows: [], total: 0, page: 1, pages: 1 })), [dataState, user, page, self]);
  return (
    <Screen title="Article-wise Audit Details" back={self ? { label: "My Stock Audit", path: "my" } : { label: "Employee performance", path: "employees" }} subtitle={e.data ? `${e.data.name || e.data.rp_name} · ${e.data.store}` : ""}>
      <Loader s={a}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage}
            keyOf={(r, i) => `${r.article_id}-${i}`}
            renderDetail={(r) => (
              <Box fontSize="sm">
                <Text fontWeight={600} mb={1}>Audit history</Text>
                {r.audited_at ? (
                  <Stack spacing={1}>
                    <KV k="Original count (RetailPilot)" v={`${fmtNum(r.counted_qty)} units · ${fmtDateTime(r.audited_at)}`} />
                    <KV k="Count session" v={<Text as="span" fontFamily="mono" fontSize="xs">{r.session}</Text>} />
                    {r.recount ? (
                      <KV k="Independent recount" v={<span>{r.recount.verdict === "MATCH" ? "✓ Matches" : "✗ Mismatch"} · {fmtDateTime(r.recount.at)} · net movement {r.recount.net_movement}</span>} />
                    ) : (
                      <KV k="Independent recount" v={<Cell c={pending("PENDING_VERIFICATION")} />} />
                    )}
                  </Stack>
                ) : (
                  <Text color="gray.500">Not audited yet</Text>
                )}
              </Box>
            )}
            columns={[
              { key: "article_name", label: "Article", primary: true },
              { key: "category", label: "Category", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.category}</Text> },
              { key: "article_id", label: "Article ID", render: (r) => r.article_id },
              { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color={r.status === "AUDITED" ? "green" : "orange"}>{r.status === "AUDITED" ? "Audited" : "Pending"}</Pill> },
              { key: "counted", label: "Counted", numeric: true, render: (r) => fmtNum(r.counted_qty) },
              { key: "var", label: "Variance", render: (r) => r.variance_kind || "—" },
              { key: "at", label: "Audited at", render: (r) => fmtDateTime(r.audited_at) },
              { key: "recount", label: "Recount", render: (r) => (r.recount ? (r.recount.verdict === "MATCH" ? "✓" : "✗") : "—") },
            ]}
          />
        )}
      </Loader>
      <Text fontSize="xs" color="gray.500" mt={2}>Book (system) stock is not shown here and is never used to judge counting accuracy.</Text>
    </Screen>
  );
}
