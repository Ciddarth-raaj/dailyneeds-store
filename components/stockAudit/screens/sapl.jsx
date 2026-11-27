import React, { useMemo, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Input, NumberInput, NumberInputField, SimpleGrid, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad, D } from "../data/adapter";
import { known, SAPL_DEFAULT_WEIGHTS, SAPL_PRIZE, saplPoints } from "../data/calc";
import { Cell, DataList, KV, Pill, PreviewButton, Progress, RankMove, Section, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtDateTime, fmtDate } from "../ui";
import { Screen, Loader, Freshness, NoAccess } from "./common";
import { P } from "../permissions";

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
      <Text fontSize="sm" opacity={0.9} mt={1}>From 25 Nov 2026 · end date to be decided · five retail stores</Text>
      <Flex mt={3} gap={2} wrap="wrap" align="center">
        <Badge bg="yellow.300" color="yellow.900" fontSize="0.85em" px={2} py={1} borderRadius="md">🏆 Championship prize ₹10,000</Badge>
        <Badge bg="whiteAlpha.300" color="white" px={2} py={1} borderRadius="md">PROVISIONAL STANDINGS</Badge>
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
    <Screen title="Premier League Leaderboard" subtitle="Ranked on comparable percentages, not article counts. Proposed scoring - not final." actions={<Freshness />}>
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
              <Text fontSize="xs" color="gray.500" mt={3}>Prize eligibility: not decided until the season ends and management approves the final standings. Qualification criteria and tie-breakers are pending your review.</Text>
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

export function SeasonMaster() {
  const { can } = useStockAudit();
  const s = useLoad(() => adapter.seasons(), []);
  return (
    <Screen title="Competition Season Master" actions={can(P.SAPL_MANAGE) ? <PreviewButton colorScheme="purple" label="New season">New season</PreviewButton> : null}>
      <Loader s={s}>
        {(rows) => rows.map((x) => (
          <Section key={x.season_no} title={`Season ${x.season_no} · ${x.name}`} subtitle="Dates, cycles, stores and scoring stay configurable until you approve them">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6}>
              <Box>
                <KV k="Start" v={fmtDate(x.start)} />
                <KV k="End" v={x.end ? fmtDate(x.end) : <Pill color="orange">to be decided</Pill>} />
                <KV k="Audit cycles" v="Q4 2026 Full Audit" />
                <KV k="Participating stores" v={`${x.stores.length}: ${D.STORES.map((s) => s.name).join(", ")}`} />
                <KV k="Prize" v={fmtMoney(x.prize)} />
              </Box>
              <Box>
                <KV k="Scoring policy" v={x.scoring} />
                <KV k="Qualification" v={<Pill color="orange">{x.qualification}</Pill>} />
                <KV k="Status" v={<Pill color="green">in progress</Pill>} />
                <KV k="Winning store" v={<Cell c={{ status: "PENDING", reason: "NOT_APPROVED" }} />} />
                <KV k="Final approval" v={<Pill color="gray">not started</Pill>} />
                <KV k="Prize distribution" v={<Pill color="gray">not started</Pill>} />
              </Box>
            </SimpleGrid>
          </Section>
        ))}
      </Loader>
    </Screen>
  );
}

export function ScoringSettings() {
  const { dataState, can } = useStockAudit();
  const [w, setW] = useState(SAPL_DEFAULT_WEIGHTS.map((x) => ({ ...x })));
  const totalMax = w.reduce((t, x) => t + (Number(x.max) || 0), 0);
  const s = useLoad(() => adapter.standings({ state: dataState, weights: w }), [dataState, JSON.stringify(w)]);
  return (
    <Screen title="Competition Scoring Settings" subtitle="Proposed 100-point scoring for your review. Weights, qualification and tie-breakers are NOT final.">
      <Section title="Weights" actions={can(P.SAPL_MANAGE) ? <PreviewButton colorScheme="purple" label="Save scoring draft" isDisabled={totalMax !== 100}>Save draft</PreviewButton> : null}>
        <Stack spacing={3}>
          {w.map((x, i) => (
            <Flex key={x.key} align="center" gap={3}>
              <Text flex="1" fontSize="sm">{x.label}</Text>
              <NumberInput size="sm" w="90px" value={x.max} min={0} max={100} onChange={(v) => setW(w.map((y, j) => (j === i ? { ...y, max: Number(v) || 0 } : y)))}><NumberInputField h="40px" /></NumberInput>
            </Flex>
          ))}
          <Text fontSize="sm" fontWeight={700} color={totalMax === 100 ? "green.600" : "red.600"}>Total {totalMax} / 100{totalMax !== 100 ? " - must be 100" : ""}</Text>
        </Stack>
      </Section>
      <Section title="Preview standings with these weights">
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
          <Text>• Minimum qualification (e.g. completion and recount coverage before a store can win)</Text>
          <Text>• Tie-breaker order (e.g. accuracy, then recount completion)</Text>
          <Text>• Season duration and which audit cycles count</Text>
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
  return (
    <Screen title="Competition History & Championship Summary" sampleNote="No season has finished yet. This screen fills from final, management-approved standings only.">
      <StatGrid cols={{ base: 2, md: 4 }}>
        <StatCard label="Seasons completed" c={0} />
        <StatCard label="Current season" c="Season 1" kind="raw" />
        <StatCard label="Prizes awarded" c={0} kind="money" />
        <StatCard label="Most titles" c={{ status: "NOT_APPLICABLE", reason: "NO_DATA" }} />
      </StatGrid>
      <Section title="Championship table">
        <DataList rows={D.STORES.map((s) => ({ ...s, titles: 0, podiums: 0 }))} keyOf={(r) => r.outlet_id} columns={[
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
