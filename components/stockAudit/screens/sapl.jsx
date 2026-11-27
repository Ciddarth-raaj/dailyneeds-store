import React, { useMemo, useState } from "react";
import { Badge, Box, Button, Checkbox, Flex, Heading, Input, NumberInput, NumberInputField, Select, SimpleGrid, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import toast from "react-hot-toast";
import { adapter, useLoad, isLive } from "../data/adapter";
import { known, SAPL_DEFAULT_WEIGHTS, SAPL_PRIZE, saplPoints } from "../data/calc";
import { Cell, DataList, KV, Pill, PreviewButton, Progress, RankMove, Section, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtDateTime, fmtDate } from "../ui";
import { Screen, Loader, Freshness, NoAccess } from "./common";
import { P, ADMIN } from "../permissions";

const MEDAL = {
  1: { bg: "linear-gradient(135deg,#F9D976,#E6B325)", border: "#D4A017", label: "🏆", text: "#5C4300" },
  2: { bg: "linear-gradient(135deg,#ECEFF1,#B0BEC5)", border: "#90A4AE", label: "🥈", text: "#37474F" },
  3: { bg: "linear-gradient(135deg,#F3C7A4,#CD7F32)", border: "#B0662A", label: "🥉", text: "#4E2A0E" },
};

function SeasonHeader() {
  return (
    <Box borderRadius="xl" p={{ base: 4, md: 5 }} mb={4} color="white" bg={`linear-gradient(120deg, ${BRAND.purple} 0%, #4B1D5E 60%, ${BRAND.orange} 140%)`} position="relative" overflow="hidden">
      <Text fontSize="xs" letterSpacing="0.2em" opacity={0.85}>DNDS STOCK AUDIT PREMIER LEAGUE</Text>
      <Heading size="lg" mt={1}>SAPL Season 1</Heading>
      <Text fontSize="sm" opacity={0.9} mt={1}>Q4 2026 Full Audit · from 25 Nov 2026 · common audit deadline 05 Dec 2026 · five retail stores</Text>
      <Flex mt={3} gap={2} wrap="wrap" align="center">
        <Badge bg="yellow.300" color="yellow.900" fontSize="0.85em" px={2} py={1} borderRadius="md">🏆 Championship prize ₹10,000</Badge>
        <Badge bg="whiteAlpha.300" color="white" px={2} py={1} borderRadius="md">DAILY PROVISIONAL STANDINGS · 27 NOV 2026</Badge>
      </Flex>
      <Text position="absolute" right={{ base: 2, md: 6 }} top={{ base: 2, md: 3 }} fontSize={{ base: "48px", md: "72px" }} opacity={0.25}>🏆</Text>
    </Box>
  );
}

export function Leaderboard() {
  const { dataState, go, can } = useStockAudit();
  const s = useLoad(() => adapter.standings({ state: dataState }), [dataState]);
  if (!can(P.SAPL_VIEW)) return <Screen title="Premier League Leaderboard"><NoAccess what="the leaderboard" /></Screen>;
  return (
    <Screen title="Premier League Leaderboard" subtitle="Completion 35 · Accuracy 40 · Recounts 20 · Participation 5 = 100 points, on comparable percentages. Shortage and excess never score." actions={<Freshness />}>
      <SeasonHeader />
      <Loader s={s}>
        {(rows) => {
          const comparable = rows.every((r) => r.comparable);
          return (
            <>
              {!comparable ? (
                <Box p={3} mb={3} bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="md" fontSize="sm">
                  <b>Ranking not publishable yet.</b> Some KPIs are pending or unavailable (e.g. completion without allotment), so points are incomplete and stores are not comparable. Order below is by points decided so far.
                </Box>
              ) : null}
              <Stack spacing={3}>
                {rows.map((r) => {
                  const m = MEDAL[r.rank];
                  return (
                    <Box key={r.store.outlet_id} borderRadius="xl" p={{ base: 3, md: 4 }} bg={m ? m.bg : "white"} border="2px solid" borderColor={m ? m.border : "gray.100"} boxShadow={r.rank === 1 ? "lg" : "sm"} cursor="pointer" onClick={() => go("sapl-store", { outlet: r.store.outlet_id })}>
                      <Flex align="center" gap={3}>
                        <Flex direction="column" align="center" minW="48px">
                          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={800} color={m ? m.text : "gray.600"} lineHeight="1">{r.rank}</Text>
                          <RankMove rank={r.rank} previous={r.previous_rank} />
                        </Flex>
                        <Box flex="1" minW={0}>
                          <Flex align="center" gap={2}>
                            <Heading size="sm" color={m ? m.text : "gray.800"} noOfLines={1}>{m ? `${m.label} ` : ""}{r.store.name}</Heading>
                            {r.rank === 1 ? <Pill color="yellow">leading</Pill> : null}
                          </Flex>
                          <Box mt={2}><Progress c={{ status: "AVAILABLE", value: r.total }} color={r.rank === 1 ? "#8B6B00" : BRAND.purple} /></Box>
                          <SimpleGrid columns={{ base: 3, md: 6 }} mt={2} spacing={1} fontSize="11px" color={m ? m.text : "gray.600"}>
                            <Box>Allotted<br /><Cell c={r.store.allotted} /></Box>
                            <Box>Audited<br /><b>{fmtNum(r.store.audited)}</b></Box>
                            <Box>Done<br /><Cell c={r.kpis.completion} kind="pct" /></Box>
                            <Box>Accuracy<br /><Cell c={r.kpis.accuracy} kind="pct" /></Box>
                            <Box>Recounts<br /><Cell c={r.kpis.recount} kind="pct" /></Box>
                            <Box>Staff<br /><Cell c={r.kpis.participation} kind="pct" /></Box>
                          </SimpleGrid>
                        </Box>
                        <Box textAlign="right" minW="64px">
                          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={800} color={m ? m.text : BRAND.purple} lineHeight="1">{r.total}</Text>
                          <Text fontSize="10px" color={m ? m.text : "gray.500"}>of 100 pts</Text>
                          {!r.complete ? <Badge mt={1} colorScheme="orange" fontSize="0.6em">incomplete</Badge> : null}
                        </Box>
                      </Flex>
                    </Box>
                  );
                })}
              </Stack>
              <Text fontSize="xs" color="gray.500" mt={3}>Standings are provisional and recalculated daily. They become final only after the season's required independent verification is complete and management approves them; then the winning store's prize eligibility is decided. Qualification criteria and tie-breakers are pending your review.</Text>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

export function StorePoints() {
  const { dataState, params, go } = useStockAudit();
  const s = useLoad(() => adapter.standings({ state: dataState }), [dataState]);
  return (
    <Screen title="Store Performance & Points Breakdown" back={{ label: "Leaderboard", path: "sapl" }}>
      <Loader s={s}>
        {(rows) => {
          const r = rows.find((x) => String(x.store.outlet_id) === String(params.outlet)) || rows[0];
          return (
            <>
              <Flex gap={2} wrap="wrap" mb={3}>
                {rows.map((x) => <Button key={x.store.outlet_id} size="sm" minH="36px" variant={x === r ? "solid" : "outline"} colorScheme="purple" onClick={() => go("sapl-store", { outlet: x.store.outlet_id })}>{x.rank}. {x.store.name}</Button>)}
              </Flex>
              <StatGrid cols={{ base: 2, md: 4 }}>
                <StatCard label="Rank (provisional)" c={r.rank} sub={<RankMove rank={r.rank} previous={r.previous_rank} />} />
                <StatCard label="Points" c={`${r.total} / 100`} kind="raw" accent={BRAND.orange} />
                <StatCard label="Previous rank" c={r.previous_rank} />
                <StatCard label="Comparable" c={r.complete ? "Yes" : "No - KPIs pending"} kind="raw" />
              </StatGrid>
              <Section title={`${r.store.name} · points by KPI`}>
                <Stack spacing={3}>
                  {r.rows.map((k) => (
                    <Box key={k.key}>
                      <Flex justify="space-between" fontSize="sm" mb={1} gap={2}>
                        <Text>{k.label}</Text>
                        <Text fontWeight={700} whiteSpace="nowrap">{k.points == null ? <Cell c={k.measure} /> : `${k.points} / ${k.max}`}</Text>
                      </Flex>
                      <Progress c={k.points == null ? k.measure : { status: "AVAILABLE", value: (k.points * 100) / k.max }} color={BRAND.orange} />
                      <Text fontSize="xs" color="gray.500" mt={1}>Measured: <Cell c={k.measure} kind="pct" /></Text>
                    </Box>
                  ))}
                </Stack>
              </Section>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

const TIE_KPIS = { accuracy: "Physical counting accuracy", completion: "Audit completion", recount: "Independent recount completion", participation: "Employee participation" };
const PRIZE_METHOD = { EQUAL: "Equal shares (mapped staff who audited)", BY_ARTICLES_AUDITED: "In proportion to articles audited", MANUAL: "Entered by management" };
const DEFAULT_RULES = {
  qualification: { confirmed: false, requireAllKpisMeasured: true, minParticipationPct: 0 },
  tie_breakers: { confirmed: false, order: ["accuracy", "completion", "recount", "participation"] },
  prize: { confirmed: false, amount: SAPL_PRIZE, method: "EQUAL", excludeUnmapped: true, minArticlesAudited: 1 },
};

/** One season: dates, prize and the still-configurable rules. Editable by administrators only; the server refuses changes that would rewrite results. */
function SeasonEditor({ x, can, today, onSaved }) {
  const admin = can(ADMIN);
  const [form, setForm] = useState({ name: x.name || "", start_date: x.start || "", end_date: x.end || "", deadline: x.deadline || "", prize_amount: x.prize == null ? "" : String(Number(x.prize)) });
  const [rules, setRules] = useState(() => ({ ...DEFAULT_RULES, ...(x.rules || {}) }));
  const set = (part, patch) => setRules({ ...rules, [part]: { ...rules[part], ...patch } });
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const order = rules.tie_breakers.order;
  const move = (i, d) => { const o = [...order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; set("tie_breakers", { order: o }); };
  const final = ["FINAL", "CLOSED"].includes(x.status);
  const datesFixed = final || !["DRAFT", "OPEN"].includes(x.status);
  const off = !admin || final;
  // a date that has already passed cannot move (the server checks this too)
  const passed = (d) => Boolean(d && today && d < today);
  const save = async () => {
    if (!isLive()) return toast("Preview only: nothing is saved.", { icon: "👁" });
    const body = { name: form.name, prize_amount: form.prize_amount, rules: { qualification: rules.qualification, tie_breakers: rules.tie_breakers, prize: { ...rules.prize, amount: Number(form.prize_amount) || rules.prize.amount } } };
    if (!datesFixed) Object.assign(body, { start_date: form.start_date, end_date: form.end_date, deadline: form.deadline });
    try {
      await adapter.updateSeason(x.season_id, body);
      toast.success("Season saved");
      onSaved();
    } catch (e) {
      toast.error(e.message || "Could not save");
    }
  };
  const dateInput = (k, label) => (
    <KV k={label} v={admin ? <Input type="date" size="sm" h="38px" w="170px" value={form[k]} onChange={f(k)} isDisabled={off || datesFixed || passed(k === "start_date" ? x.start : k === "end_date" ? x.end : x.deadline)} /> : fmtDate(form[k])} />
  );
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={3}>
      <Box>
        {admin ? <KV k="Season name" v={<Input size="sm" h="38px" maxW="240px" value={form.name} onChange={f("name")} isDisabled={off} />} /> : null}
        {dateInput("start_date", "Start date")}
        {dateInput("end_date", "End date")}
        {dateInput("deadline", "Audit completion deadline (all stores)")}
        <KV k="Participating stores" v={`${x.stores.length} retail stores (warehouse excluded)`} />
        <KV k="Winning store prize" v={admin ? <Input size="sm" h="38px" w="140px" type="number" min={1} value={form.prize_amount} onChange={f("prize_amount")} isDisabled={off} /> : `${fmtMoney(x.prize)} to the winning store`} />
        <KV k="Points" v={x.scoring} />
        <KV k="Standings" v="Provisional, recalculated daily" />
        <KV k="Final ranking" v="After independent verification, finalised by a different person" />
        <KV k="Status" v={<Pill color="green">{String(x.status).replace(/_/g, " ").toLowerCase()}</Pill>} />
        {admin && !final ? <Text fontSize="xs" color="gray.500" mt={2}>Dates that have passed cannot move, and nothing can move into the past, so earlier results never change. The start is fixed once allotments are imported; all dates are fixed once incentives are approved or verification starts.</Text> : null}
      </Box>
      <Box>
        <Text fontWeight={600} fontSize="sm">Qualification <Pill color="orange">pending your decision</Pill></Text>
        <Checkbox mt={1} isChecked={rules.qualification.requireAllKpisMeasured} isDisabled={off} onChange={(e) => set("qualification", { requireAllKpisMeasured: e.target.checked })}>All four KPIs must be measured</Checkbox>
        <Flex align="center" gap={2} mt={1} fontSize="sm"><Text>Minimum participation %</Text>
          <NumberInput size="sm" w="90px" min={0} max={100} value={rules.qualification.minParticipationPct} isDisabled={off} onChange={(_, v) => set("qualification", { minParticipationPct: Number.isFinite(v) ? v : 0 })}><NumberInputField h="36px" /></NumberInput>
        </Flex>
        <Text fontWeight={600} fontSize="sm" mt={3}>Tie-breakers, in order <Pill color="orange">pending your decision</Pill></Text>
        <Stack spacing={1} mt={1}>
          {order.map((k, i) => (
            <Flex key={k} align="center" gap={2} fontSize="sm">
              <Text w="18px">{i + 1}.</Text><Text flex="1">{TIE_KPIS[k]}</Text>
              <Button size="xs" variant="ghost" isDisabled={off || i === 0} onClick={() => move(i, -1)}>↑</Button>
              <Button size="xs" variant="ghost" isDisabled={off || i === order.length - 1} onClick={() => move(i, 1)}>↓</Button>
            </Flex>
          ))}
        </Stack>
        <Text fontSize="xs" color="gray.500">Equal on every tie-breaker: shared rank, no winner until management decides.</Text>
        <Text fontWeight={600} fontSize="sm" mt={3}>Prize distribution method <Pill color="orange">pending your decision</Pill></Text>
        <Select size="sm" h="38px" mt={1} value={rules.prize.method} isDisabled={off} onChange={(e) => set("prize", { method: e.target.value })}>
          {Object.entries(PRIZE_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Text fontSize="xs" color="gray.500" mt={1}>Unmapped staff are always excluded. Shares stay drafts: nothing is sent to payroll.</Text>
      </Box>
      {admin && !final ? <Box><Button size="sm" minH="40px" colorScheme="purple" onClick={save}>Save season</Button></Box> : null}
    </SimpleGrid>
  );
}

/** New season (administrators): creates the season and its internal store cycles together. */
function NewSeason({ onCreated }) {
  const { meta } = useStockAudit();
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", deadline: "", prize_amount: String(SAPL_PRIZE) });
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const create = async () => {
    if (!isLive()) return toast("Preview only: nothing is saved.", { icon: "👁" });
    if (!form.start_date || !form.end_date || !form.deadline) return toast.error("Enter the start date, end date and completion deadline");
    try {
      await adapter.createSeason(form);
      toast.success("Season created for all five retail stores");
      setForm({ name: "", start_date: "", end_date: "", deadline: "", prize_amount: String(SAPL_PRIZE) });
      onCreated();
    } catch (e) {
      toast.error(e.message || "Could not create the season");
    }
  };
  return (
    <Section title="New season" subtitle="Creates the season for all five retail stores (warehouse excluded). Seasons cannot overlap: one day of audits belongs to one season only.">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Box><Text fontSize="xs" mb={1}>Season name</Text><Input size="sm" h="40px" placeholder="Season 2" value={form.name} onChange={f("name")} /></Box>
        <Box><Text fontSize="xs" mb={1}>Start date</Text><Input size="sm" h="40px" type="date" min={meta.today} value={form.start_date} onChange={f("start_date")} /></Box>
        <Box><Text fontSize="xs" mb={1}>End date</Text><Input size="sm" h="40px" type="date" value={form.end_date} onChange={f("end_date")} /></Box>
        <Box><Text fontSize="xs" mb={1}>Audit completion deadline</Text><Input size="sm" h="40px" type="date" value={form.deadline} onChange={f("deadline")} /></Box>
        <Box><Text fontSize="xs" mb={1}>Winning store prize (₹)</Text><Input size="sm" h="40px" type="number" min={1} value={form.prize_amount} onChange={f("prize_amount")} /></Box>
      </SimpleGrid>
      <Text fontSize="xs" color="gray.500" mt={2}>Points are fixed: completion 35, accuracy 40, independent recount 20, participation 5.</Text>
      <Button mt={3} size="sm" minH="40px" colorScheme="purple" onClick={create}>Create season</Button>
    </Section>
  );
}

/**
 * Screen 25: the season is the ONE record of the programme (its internal
 * store cycles are created and changed with it). Administrators create and
 * change seasons; everyone else sees them read-only.
 */
export function SeasonMaster() {
  const { can, meta, reloadMeta } = useStockAudit();
  const [tick, setTick] = useState(0);
  const s = useLoad(() => adapter.seasons(), [tick]);
  const refresh = () => {
    setTick(tick + 1);
    reloadMeta();
  };
  return (
    <Screen title="Season Master" subtitle="One season covers the whole Stock Audit Incentive Programme for its dates: allotments, audits, incentives, headcount, responsible persons, standings and the daily PDFs. Every season starts with fresh points; past seasons are kept.">
      <Loader s={s}>
        {(rows) => (rows.length ? rows.map((x) => (
          <Section key={x.season_id || x.season_no} title={<Flex align="center" gap={2} wrap="wrap">{x.name}{x.current ? <Badge colorScheme="purple">current</Badge> : null}</Flex>} subtitle={`${fmtDate(x.start)} – ${fmtDate(x.end)} · completion deadline ${fmtDate(x.deadline)}`}>
            <SeasonEditor key={`${x.season_id}-${tick}`} x={x} can={can} today={meta.today} onSaved={refresh} />
          </Section>
        )) : <Box p={6} bg="gray.50" borderRadius="md" fontSize="sm">No season yet.{can(ADMIN) ? " Create it below." : " An administrator creates it."}</Box>)}
      </Loader>
      {can(ADMIN) ? <NewSeason onCreated={refresh} /> : null}
    </Screen>
  );
}

export function ScoringSettings() {
  const { dataState } = useStockAudit();
  const w = SAPL_DEFAULT_WEIGHTS;
  const s = useLoad(() => adapter.standings({ state: dataState, weights: w }), [dataState]);
  return (
    <Screen title="Competition Scoring Settings" subtitle="Scoring confirmed on 27 Nov 2026. Each KPI scores its percentage of the maximum points; missing data stays Pending, never zero or full.">
      <Section title="Points (confirmed)">
        <Stack spacing={2}>
          {w.map((x) => (
            <Flex key={x.key} justify="space-between" align="center" p={2} bg="purple.50" borderRadius="md" fontSize="sm">
              <Text>{x.label}</Text><Text fontWeight={700}>{x.max} points</Text>
            </Flex>
          ))}
          <Flex justify="space-between" p={2} fontWeight={700} color="green.700"><Text>Total</Text><Text>{w.reduce((t, x) => t + x.max, 0)} points</Text></Flex>
        </Stack>
        <Text fontSize="xs" color="gray.500" mt={2}>Variance closure is not scored (RetailPilot has no closure data). Shortage and excess values never affect points or rankings.</Text>
      </Section>
      <Section title="How each KPI is measured">
        <Stack fontSize="sm" spacing={1}>
          <Text>• Audit completion: audited ÷ allotted (Effective = Y, imported CSVs)</Text>
          <Text>• Physical counting accuracy: correct ÷ verified independent random recounts</Text>
          <Text>• Independent recount completion: recounts done ÷ the 5% required</Text>
          <Text>• Employee participation: employees who audited ÷ eligible employees</Text>
        </Stack>
      </Section>
      <Section title="Today's provisional standings">
        <Loader s={s}>
          {(rows) => (
            <DataList rows={rows} keyOf={(r) => r.store.outlet_id} columns={[
              { key: "rank", label: "#", primary: true, render: (r) => `${r.rank}. ${r.store.name}` },
              { key: "pts", label: "Points", numeric: true, mobileRight: true, render: (r) => <b>{r.total}</b> },
              { key: "complete", label: "Comparable", render: (r) => (r.complete ? "Yes" : <Pill color="orange">KPIs pending</Pill>) },
            ]} />
          )}
        </Loader>
      </Section>
      <Section title="Still to decide">
        <Stack fontSize="sm" spacing={1}>
          <Text>• Minimum qualification before a store can win</Text>
          <Text>• Tie-breaker order</Text>
          <Text>• Season duration and the prize distribution method</Text>
        </Stack>
      </Section>
    </Screen>
  );
}

const METHODS = [
  { key: "equal", label: "Equal" },
  { key: "performance", label: "Performance-based" },
  { key: "combined", label: "Equal + performance" },
  { key: "manual", label: "Manual (management)" },
];

export function PrizeDistribution() {
  const { dataState, can } = useStockAudit();
  const [method, setMethod] = useState("equal");
  const [split, setSplit] = useState(50);
  const [manual, setManual] = useState({});
  const s = useLoad(() => adapter.standings({ state: dataState }), [dataState]);
  if (!can(P.SAPL_VIEW)) return <Screen title="Winning Store Prize Distribution"><NoAccess what="the prize distribution" /></Screen>;
  return (
    <Screen title="Winning Store Prize Distribution" subtitle="SAPL – Winner Incentive. Preview of four methods; none is active until you approve one." sampleNote="SAMPLE: the season has not ended, so the 'winner' below is only the current provisional leader.">
      <Loader s={s}>
        {(rows) => {
          const win = rows[0];
          const eligible = win.store.employees.filter((e) => e.audited > 0 && e.employee_id);
          const unmappedOut = win.store.employees.filter((e) => e.audited > 0 && !e.employee_id).length;
          const perfWeight = (e) => e.audited * (known(e.accuracy) ? e.accuracy.value / 100 : 1);
          const perfSum = eligible.reduce((t, e) => t + perfWeight(e), 0);
          const alloc = eligible.map((e) => {
            const equal = SAPL_PRIZE / eligible.length;
            const perf = (SAPL_PRIZE * perfWeight(e)) / perfSum;
            let amt = method === "equal" ? equal : method === "performance" ? perf : method === "combined" ? (equal * split) / 100 + (perf * (100 - split)) / 100 : Number(manual[e.rp_user_id] || 0);
            return { e, amount: Math.floor(amt) };
          });
          const allocated = alloc.reduce((t, a) => t + a.amount, 0);
          const over = allocated > SAPL_PRIZE;
          return (
            <>
              <StatGrid cols={{ base: 2, md: 4 }}>
                <StatCard label="Winning store (provisional)" c={win.store.name} kind="raw" accent="yellow.400" />
                <StatCard label="Score" c={`${win.total} / 100`} kind="raw" />
                <StatCard label="Prize" c={SAPL_PRIZE} kind="money" />
                <StatCard label="Eligible employees" c={eligible.length} sub={unmappedOut ? `${unmappedOut} unmapped RetailPilot user(s) excluded until mapped` : "Participated in the audit"} />
                <StatCard label="Allocated" c={allocated} kind="money" accent={over ? "red.400" : "green.400"} />
                <StatCard label="Remaining" c={SAPL_PRIZE - allocated} kind="money" />
                <StatCard label="Management approval" c={{ status: "PENDING", reason: "NOT_APPROVED" }} />
                <StatCard label="Payroll" c="Not started" kind="raw" />
              </StatGrid>
              <Section title="Method">
                <Flex gap={2} wrap="wrap">{METHODS.map((m) => <Button key={m.key} size="sm" minH="40px" colorScheme="purple" variant={method === m.key ? "solid" : "outline"} onClick={() => setMethod(m.key)}>{m.label}</Button>)}</Flex>
                {method === "combined" ? (
                  <Box mt={4} maxW="420px">
                    <Text fontSize="sm">Equal share {split}% · performance share {100 - split}%</Text>
                    <Slider value={split} min={0} max={100} step={10} onChange={setSplit} colorScheme="purple"><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb boxSize={6} /></Slider>
                  </Box>
                ) : null}
                <Text fontSize="xs" color="gray.500" mt={3}>Amounts are rounded down to the rupee; the remainder stays unallocated. The total can never exceed ₹10,000, and a prize is allocated and paid only once.</Text>
                {over ? <Text color="red.600" fontSize="sm" mt={2}>Allocated amount exceeds the ₹10,000 prize: reduce the manual amounts.</Text> : null}
              </Section>
              <Section title="Allocation">
                <DataList rows={alloc} keyOf={(a) => a.e.rp_user_id} columns={[
                  { key: "name", label: "Employee", primary: true, render: (a) => a.e.name || a.e.rp_name },
                  { key: "d", label: "Designation", primary: true, render: (a) => <Text as="span" fontSize="xs" color="gray.500">{a.e.designation} · {fmtNum(a.e.audited)} articles</Text> },
                  { key: "amt", label: "Allocation", numeric: true, mobileRight: true, render: (a) => (method === "manual" ? (
                    <NumberInput size="sm" w="110px" min={0} value={manual[a.e.rp_user_id] || ""} onChange={(v) => setManual({ ...manual, [a.e.rp_user_id]: v })}><NumberInputField h="38px" /></NumberInput>
                  ) : <b>{fmtMoney(a.amount)}</b>) },
                  { key: "acc", label: "Accuracy", numeric: true, render: (a) => <Cell c={a.e.accuracy} kind="pct" /> },
                ]} />
                <Flex mt={3} gap={2}><PreviewButton colorScheme="purple" label="Submit for management approval" isDisabled={over}>Submit for approval</PreviewButton></Flex>
              </Section>
            </>
          );
        }}
      </Loader>
    </Screen>
  );
}

export function CompetitionHistory() {
  const { meta } = useStockAudit();
  return (
    <Screen title="Competition History & Championship Summary" sampleNote="No season has finished yet. This screen fills from final, management-approved standings only.">
      <StatGrid cols={{ base: 2, md: 4 }}>
        <StatCard label="Seasons completed" c={0} />
        <StatCard label="Current season" c="Season 1" kind="raw" />
        <StatCard label="Prizes awarded" c={0} kind="money" />
        <StatCard label="Most titles" c={{ status: "NOT_APPLICABLE", reason: "NO_DATA" }} />
      </StatGrid>
      <Section title="Championship table">
        <DataList rows={meta.stores.map((s) => ({ ...s, titles: 0, podiums: 0 }))} keyOf={(r) => r.outlet_id} columns={[
          { key: "name", label: "Store", primary: true },
          { key: "titles", label: "Titles", numeric: true, mobileRight: true, render: (r) => r.titles },
          { key: "podiums", label: "Podium finishes", numeric: true, render: (r) => r.podiums },
          { key: "best", label: "Best finish", render: () => "—" },
        ]} />
      </Section>
      <Section title="Past seasons"><Text fontSize="sm" color="gray.500">None yet. Season 1 started on 25 Nov 2026.</Text></Section>
    </Screen>
  );
}
