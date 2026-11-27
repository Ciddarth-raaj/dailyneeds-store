import React, { useState } from "react";
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad, D } from "../data/adapter";
import { available, pending, known, unavailable } from "../data/calc";
import { Cell, DataList, FilterBar, KV, Pill, Progress, SearchField, Section, SelectField, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtDateTime, fmtDate } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, Freshness, useScope, NoAccess } from "./common";
import { P } from "../permissions";

const total = (list, f) => list.reduce((t, x) => t + f(x), 0);
const sumCell = (list, k) => (list.every((s) => known(s[k])) ? available(total(list, (s) => s[k].value)) : list.find((s) => !known(s[k]))[k]);

export function CompanyDashboard() {
  const { dataState, go, can } = useStockAudit();
  const scope = useScope();
  const s = useLoad(() => adapter.stores({ state: dataState, outlets: scope }), [dataState, scope]);
  const m = useLoad(() => adapter.management({ state: dataState }), [dataState]);
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
                <StatCard label="Participating stores" c={stores.length} sub="Warehouse excluded" />
                <StatCard label="Eligible employees" c={total(stores, (x) => x.eligible_employees)} />
                <StatCard label="Employees participating" c={total(stores, (x) => x.participating)} />
                <StatCard label="Articles allotted" c={allotted} />
                <StatCard label="Audited today" c={total(stores, (x) => x.audited_today)} accent={BRAND.orange} />
                <StatCard label="Total audited" c={audited} />
                <StatCard label="Pending articles" c={known(allotted) ? available(allotted.value - audited) : allotted} />
                <StatCard label="Completion" kind="pct" c={known(allotted) ? available((audited * 100) / allotted.value) : allotted} />
                <StatCard label="Recounts" c={verified} sub={`of ${fmtNum(required)} required (5%)`} />
                <StatCard label="Counting accuracy" kind="pct" c={matchedPctCell} accent={BRAND.orange} />
              </StatGrid>
              <StatGrid cols={{ base: 2, md: 4 }}>
                <StatCard label="Shortage" c={total(stores, (x) => x.shortage_value)} kind="money" sub={`${fmtNum(total(stores, (x) => x.shortage_qty))} units`} accent="red.400" />
                <StatCard label="Excess" c={total(stores, (x) => x.excess_value)} kind="money" sub={`${fmtNum(total(stores, (x) => x.excess_qty))} units`} accent="green.400" />
                <StatCard label="Variance cases open" c={total(stores, (x) => x.variance_open)} sub={`${fmtNum(total(stores, (x) => x.variance_closed))} closed`} />
                <StatCard label="Estimated employee incentives" c={total(stores, (x) => x.estimated_employee)} kind="money" sub={`${total(stores, (x) => x.estimated_employee_pending)} employees still pending`} />
                <StatCard label="Estimated management incentives" c={mgmtDecided} kind="money" sub="Decided KPIs only; others pending" />
                <StatCard label="Approved incentives" c={pending("NOT_APPROVED")} kind="money" />
                <StatCard label="Payroll-processed" c={pending("NOT_APPROVED")} kind="money" />
                <StatCard label="SAPL prize" c={10000} kind="money" sub="Separate team incentive" accent="yellow.400" onClick={() => go("sapl")} />
              </StatGrid>
              <Section title="Stores" subtitle="Tap a store to drill down: Store → Employee → Article → Audit history">
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                  {stores.map((st) => (
                    <Box key={st.outlet_id} border="1px solid" borderColor="gray.100" borderRadius="lg" p={3} cursor="pointer" _hover={{ boxShadow: "md" }} onClick={() => go("store", { outlet: st.outlet_id })}>
                      <Flex justify="space-between" mb={2}><Heading size="sm">{st.name}</Heading><Pill>{st.eligible_employees} employees</Pill></Flex>
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
              <StatCard label="Articles allotted" c={st.allotted} />
              <StatCard label="Audited today" c={st.audited_today} accent={BRAND.orange} />
              <StatCard label="Total audited" c={st.audited} />
              <StatCard label="Pending" c={st.pending} />
              <StatCard label="Completion" c={st.completion} kind="pct" />
              <StatCard label="Accuracy" c={st.accuracy} kind="pct" accent={BRAND.orange} />
              <StatCard label="Recounts" c={st.recount_done} sub={`of ${fmtNum(st.recount_required)} required`} />
              <StatCard label="Shortage value" c={st.shortage_value} kind="money" accent="red.400" />
              <StatCard label="Excess value" c={st.excess_value} kind="money" accent="green.400" />
              <StatCard label="Variance open / closed" c={`${st.variance_open} / ${st.variance_closed}`} kind="raw" />
              <StatCard label="Employees participating" c={`${st.participating} of ${st.eligible_employees}`} kind="raw" />
              <StatCard label="Estimated employee incentives" c={st.estimated_employee} kind="money" />
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
              { key: "est", label: "Estimated", numeric: true, render: (r) => <Cell c={r.estimated} kind="money" /> },
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
  const me = D.employees().find((e) => e.outlet_id === 7 && e.employee_id) || D.employees()[0];
  const s = useLoad(() => adapter.employee({ state: dataState, rpUserId: me.rp_user_id }), [dataState]);
  return (
    <Screen title="My Stock Audit · என் ஸ்டாக் ஆடிட்" subtitle={viewer.self ? "Only your own figures are shown" : "Shown here as one sample employee"} actions={<Freshness />}>
      <Loader s={s}>
        {(e) => (
          <>
            <Section>
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <Box><Heading size="md">{e.name}</Heading><Text fontSize="sm" color="gray.500">{e.designation} · {e.store} · {e.code}</Text></Box>
                <Pill color="orange">{e.calc_status.replace(/_/g, " ").toLowerCase()}</Pill>
              </Flex>
            </Section>
            <StatGrid cols={{ base: 2, md: 4 }}>
              <StatCard label="Articles allotted" tamil="ஒதுக்கப்பட்ட பொருட்கள்" c={e.allotted_c} />
              <StatCard label="Audited today" tamil="இன்று சரிபார்த்தவை" c={e.today} accent={BRAND.orange} />
              <StatCard label="Total audited" tamil="மொத்தம் சரிபார்த்தவை" c={e.audited} />
              <StatCard label="Pending" tamil="மீதமுள்ளவை" c={e.pending_c} />
              <StatCard label="Recounts" tamil="மறு எண்ணிக்கை" c={`${e.recount_done} / ${e.recount_required}`} kind="raw" sub="Done / required (5%)" />
              <StatCard label="Counting accuracy" tamil="எண்ணிக்கை துல்லியம்" c={e.accuracy} kind="pct" accent={BRAND.orange} />
              <StatCard label="Estimated incentive" tamil="மதிப்பிடப்பட்ட ஊக்கத்தொகை" c={e.estimated} kind="money" sub={e.provisional != null ? `If eligibility is confirmed: ${fmtMoney(e.provisional)}` : null} />
              <StatCard label="Approved incentive" tamil="அங்கீகரிக்கப்பட்ட ஊக்கத்தொகை" c={e.approved_c} kind="money" />
            </StatGrid>
            <Section title="How your incentive works · ஊக்கத்தொகை எப்படி">
              <Stack fontSize="sm" spacing={1}>
                <Text>₹1.10 per article at 99% accuracy or more · ₹1.00 at 97% · ₹0.50 at 95% · nil below 95%.</Text>
                <Text>Accuracy comes only from independent recounts of your articles (at least 5%). A genuine shortage that the recount confirms is counted as correct.</Text>
              </Stack>
              <Button mt={3} size="sm" colorScheme="purple" onClick={() => go("articles", { user: e.rp_user_id })}>My articles</Button>
            </Section>
          </>
        )}
      </Loader>
    </Screen>
  );
}

export function ArticleAuditDetails() {
  const { dataState, params } = useStockAudit();
  const user = params.user || D.employees()[0].rp_user_id;
  const [page, setPage] = useState(1);
  const e = useLoad(() => adapter.employee({ state: dataState, rpUserId: user }), [dataState, user]);
  const a = useLoad(() => adapter.articles({ state: dataState, rpUserId: user, page, size: 20 }), [dataState, user, page]);
  return (
    <Screen title="Article-wise Audit Details" back={{ label: "Employee performance", path: "employees" }} subtitle={e.data ? `${e.data.name || e.data.rp_name} · ${e.data.store}` : ""}>
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
