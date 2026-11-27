import React, { useState } from "react";
import { Badge, Box, Stack, Text } from "@chakra-ui/react";
import { useStockAudit } from "../context";
import { adapter, useLoad } from "../data/adapter";
import { DataList, FilterBar, KV, Pill, PreviewButton, Section, SelectField, StatCard, StatGrid, BRAND, fmtMoney, fmtNum, fmtDateTime } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, useScope } from "./common";
import { P } from "../permissions";

const VERDICT = {
  MATCH: { color: "green", label: "Correct" },
  MISMATCH: { color: "red", label: "Counting error" },
  UNRESOLVED: { color: "orange", label: "Unresolved" },
};

export function RecountVerification() {
  const { dataState, can } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(scope ? String(scope[0]) : "");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const s = useLoad(() => adapter.verifications({ state: dataState, outletId: outlet ? Number(outlet) : null, page, size: 15 }), [dataState, outlet, page]);
  return (
    <Screen
      title="Recount & Verification Report"
      subtitle="Independent recounts done in RetailPilot. The recount is compared with the ORIGINAL physical count, carried over genuine stock movements between the two counts."
      sampleNote="SAMPLE recounts. RetailPilot recounts start shortly; until real recount transactions are inspected, how they are read from RetailPilot is pending."
    >
      <Section title="How a recount is judged">
        <Stack fontSize="sm" spacing={1}>
          <Text>Expected recount = original physical count + net movement between the counts (sales, purchases, transfers, returns, damages; book-only adjustments excluded).</Text>
          <Text>Example: counted 100 · 5 sold · recount 95 → expected 95 → the original count was <b>correct</b>.</Text>
          <Text>A movement too close to either count, or movements that cannot be read, leave the recount <b>Unresolved</b>: it is not counted in the 5% sample. A recount by the same person is never counted.</Text>
        </Stack>
      </Section>
      <FilterBar>
        <StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} />
        <CycleSelect />
        <SelectField label="Type" value={kind} onChange={setKind} options={[{ value: "", label: "Random and targeted" }, { value: "RANDOM", label: "Random (counts toward 5%)" }, { value: "TARGETED", label: "Targeted discrepancy checks" }]} />
      </FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows.filter((r) => !kind || r.kind === kind)} page={d.page} pages={d.pages} total={d.total} onPage={setPage}
            keyOf={(r, i) => `${r.original_user}-${i}`}
            renderDetail={(r) => (
              <Box maxW="460px">
                <KV k="Original physical count" v={`${r.original_qty} · ${fmtDateTime(r.original_at)} · ${r.original_user}`} />
                <KV k="Net movement between counts" v={r.movement_qty} />
                <KV k="Expected at recount" v={r.expected_qty} />
                <KV k="Independent recount" v={`${r.recount_qty} · ${fmtDateTime(r.recount_at)} · ${r.recount_user}`} />
                {r.reason ? <KV k="Why unresolved" v={r.reason} /> : null}
                {can(P.VERIFY) ? (
                  <Stack direction="row" mt={2}>
                    <PreviewButton colorScheme="purple" label="Confirm verification">Confirm</PreviewButton>
                    <PreviewButton variant="outline" label="Keep unresolved">Keep unresolved</PreviewButton>
                  </Stack>
                ) : null}
              </Box>
            )}
            columns={[
              { key: "article", label: "Article", primary: true },
              { key: "employee", label: "Counted by", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.employee} · {r.store}</Text> },
              { key: "verdict", label: "Result", mobileRight: true, render: (r) => <Badge colorScheme={VERDICT[r.verdict].color}>{VERDICT[r.verdict].label}</Badge> },
              { key: "kind", label: "Type", render: (r) => <Pill color={r.kind === "RANDOM" ? "purple" : "gray"}>{r.kind === "RANDOM" ? "Random" : "Targeted"}</Pill> },
              { key: "orig", label: "Original", numeric: true, render: (r) => r.original_qty },
              { key: "mov", label: "Movement", numeric: true, render: (r) => r.movement_qty },
              { key: "exp", label: "Expected", numeric: true, render: (r) => r.expected_qty },
              { key: "rec", label: "Recount", numeric: true, render: (r) => r.recount_qty },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

export function VarianceReport() {
  const { dataState, can } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(scope ? String(scope[0]) : "");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const s = useLoad(() => adapter.variances({ state: dataState, outletId: outlet ? Number(outlet) : null, kind: kind || null, page, size: 15 }), [dataState, outlet, kind, page]);
  const st = useLoad(() => adapter.stores({ state: dataState, outlets: outlet ? [Number(outlet)] : scope }), [dataState, outlet]);
  return (
    <Screen title="Stock Shortage & Excess Report" subtitle="Shortages and excess booked by RetailPilot audits, for management review only. They never affect incentives or Premier League rankings.">
      <Loader s={st}>
        {(stores) => (
          <StatGrid cols={{ base: 2, md: 4 }}>
            <StatCard label="Shortage value" c={stores.reduce((t, x) => t + x.shortage_value, 0)} kind="money" accent="red.400" sub={`${fmtNum(stores.reduce((t, x) => t + x.shortage_qty, 0))} units`} />
            <StatCard label="Excess value" c={stores.reduce((t, x) => t + x.excess_value, 0)} kind="money" accent="green.400" sub={`${fmtNum(stores.reduce((t, x) => t + x.excess_qty, 0))} units`} />
            <StatCard label="Net variance" c={stores.reduce((t, x) => t + x.excess_value - x.shortage_value, 0)} kind="money" />
            <StatCard label="Used for incentives / SAPL" c="No - review only" kind="raw" />
          </StatGrid>
        )}
      </Loader>
      <FilterBar>
        <StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} />
        <CycleSelect />
        <SelectField label="Type" value={kind} onChange={(v) => { setKind(v); setPage(1); }} options={[{ value: "", label: "Shortage and excess" }, { value: "Short", label: "Shortage" }, { value: "Over", label: "Excess" }]} />
      </FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage} keyOf={(r, i) => `${r.article}-${r.store}-${i}`}
            columns={[
              { key: "article", label: "Article", primary: true },
              { key: "store", label: "Branch", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store} · {r.category}</Text> },
              { key: "value", label: "Value", numeric: true, mobileRight: true, render: (r) => <Text as="span" fontWeight={600} color={r.value < 0 ? "red.600" : "green.600"}>{fmtMoney(r.value)}</Text> },
              { key: "qty", label: "Qty", numeric: true, render: (r) => r.qty },
              { key: "kind", label: "Type", render: (r) => (r.kind === "Short" ? "Shortage" : "Excess") },
              { key: "by", label: "Counted by", render: (r) => r.counted_by },
              { key: "at", label: "Audited", render: (r) => fmtDateTime(r.audited_at) },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}
