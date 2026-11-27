import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Checkbox, Flex, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useStockAudit } from "../context";
import { adapter, useLoad, D } from "../data/adapter";
import { FIELDS, readWorkbook, guessMapping, missingRequired, validateRows, diffRevision, sampleWorkbook, workbookToFile } from "../data/allotmentImport";
import { Cell, DataList, FilterBar, Pill, PreviewButton, Section, StatCard, StatGrid, BRAND, fmtNum, fmtDateTime } from "../ui";
import { Screen, Loader, StoreSelect, CycleSelect, useScope } from "./common";

export function AllotmentReport() {
  const { dataState, go } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(scope ? String(scope[0]) : "");
  const [page, setPage] = useState(1);
  const s = useLoad(() => adapter.employees({ state: dataState, outlets: outlet ? [Number(outlet)] : scope, page, size: 15, sort: "allotted" }), [dataState, outlet, page]);
  return (
    <Screen
      title="Article Allotment Report"
      subtitle="Read-only. Allotment is done in RetailPilot and imported here; DNDS never creates or edits an allotment."
      actions={<Button size="sm" colorScheme="purple" onClick={() => go("import")}>Import allotment Excel</Button>}
    >
      {dataState !== "allotment" ? (
        <Box p={3} mb={3} bg="gray.50" borderRadius="md" fontSize="sm">No allotment imported for this cycle yet: allotted, pending and completion stay <b>Unavailable</b>. Actual audits are shown.</Box>
      ) : null}
      <FilterBar>
        <StoreSelect value={outlet} onChange={(v) => { setOutlet(v); setPage(1); }} />
        <CycleSelect />
      </FilterBar>
      <Loader s={s}>
        {(d) => (
          <DataList
            rows={d.rows} page={d.page} pages={d.pages} total={d.total} onPage={setPage} keyOf={(r) => r.rp_user_id}
            onRowClick={(r) => go("articles", { user: r.rp_user_id })}
            columns={[
              { key: "name", label: "Employee", primary: true, render: (r) => r.name || r.rp_name },
              { key: "store", label: "Branch", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store}</Text> },
              { key: "allotted", label: "Allotted", numeric: true, mobileRight: true, render: (r) => <Cell c={r.allotted_c} /> },
              { key: "audited", label: "Audited", numeric: true, render: (r) => fmtNum(r.audited) },
              { key: "pending", label: "Pending", numeric: true, render: (r) => <Cell c={r.pending_c} /> },
              { key: "completion", label: "Completion", numeric: true, render: (r) => <Cell c={r.completion_c} kind="pct" /> },
              { key: "source", label: "Allotment source", render: () => (dataState === "allotment" ? <Pill color="orange">Sample Excel rev 1</Pill> : <Pill color="gray">None</Pill>) },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}

const STEPS = ["Cycle & branch", "File", "Map columns", "Dry run", "Confirm"];

function Steps({ at }) {
  return (
    <Flex gap={1} mb={4} wrap="wrap">
      {STEPS.map((s, i) => (
        <Flex key={s} align="center" gap={1} px={2} py={1} borderRadius="full" fontSize="xs" bg={i === at ? BRAND.purple : i < at ? "purple.50" : "gray.50"} color={i === at ? "white" : i < at ? BRAND.purple : "gray.500"}>
          <b>{i + 1}</b> {s}
        </Flex>
      ))}
    </Flex>
  );
}

/** Screens 6 + 7: the import flow; `startAt` jumps straight to the dry run of the sample file. */
export function AllotmentImport({ startAt = 0 }) {
  const { go } = useStockAudit();
  const scope = useScope();
  const [outlet, setOutlet] = useState(String(scope ? scope[0] : 7));
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [mapping, setMapping] = useState({});
  const [complete, setComplete] = useState(false);
  const [scopeMode, setScopeMode] = useState("auditor");
  const [rowFilter, setRowFilter] = useState("invalid");
  const [rowPage, setRowPage] = useState(1);
  const fileRef = useRef();
  const store = D.STORES.find((s) => String(s.outlet_id) === outlet);

  const masters = useMemo(() => {
    const emps = D.employees();
    const byRef = new Map();
    emps.forEach((e) => { if (e.code) byRef.set(e.code.toLowerCase(), e); byRef.set(e.rp_user_id.toLowerCase(), e); });
    return {
      branch: store,
      employeeOf: (v) => { const e = byRef.get(String(v).toLowerCase()); return e && e.employee_id && e.outlet_id === store.outlet_id ? e : null; },
      articleOf: (v) => (/^\d{6}$/.test(String(v)) ? { article_id: Number(v) } : null),
    };
  }, [outlet]);

  const load = async (f) => {
    try {
      const wb = await readWorkbook(f);
      setFile(f);
      setSheet(wb);
      setMapping(guessMapping(wb.headers));
      setStep(2);
    } catch (err) {
      toast.error(`Could not read the file: ${err.message}`);
    }
  };
  const useSample = (revision = 1) => load(workbookToFile(sampleWorkbook(store, D.employees(), { revision }), `SAMPLE_${store.short}_allotment_rev${revision}.xlsx`));

  useEffect(() => { if (startAt >= 3) useSample(1).then(() => setStep(3)); }, []); // eslint-disable-line

  const missing = missingRequired(mapping);
  const result = useMemo(() => (sheet && !missing.length ? validateRows(sheet.rows, mapping, masters) : null), [sheet, mapping, masters]);
  const previous = useMemo(() => (result ? result.rows.filter((r) => !r.errors.length).slice(0, 30).map((r, i) => ({ article: r.article, employee: i % 9 === 0 ? "DN0000" : r.employee })) : []), [result]);
  const diff = result ? diffRevision(previous, result.rows, { completeReplacement: complete, scope: scopeMode }) : null;

  return (
    <Screen title={startAt >= 3 ? "Excel Import – Dry Run & Validation" : "Article Allotment – Excel Import"} subtitle="Imports RetailPilot's 'assortment-effective' export (one auditor per file). Mapping follows the first real export; still provisional until you confirm it." back={{ label: "Allotment report", path: "allotment" }}>
      <Steps at={step} />
      {step === 0 && (
        <Section title="1. Select cycle and branch">
          <Stack spacing={3} maxW="420px">
            <CycleSelect />
            <StoreSelect value={outlet} onChange={setOutlet} allowAll={false} />
            <Button colorScheme="purple" minH="44px" onClick={() => setStep(1)}>Continue</Button>
          </Stack>
        </Section>
      )}
      {step === 1 && (
        <Section title="2. Upload the RetailPilot allotment export" subtitle={`${store.name} · Q4 2026 Full Audit. The original file is kept, unchanged, with the upload.`}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && load(e.target.files[0])} />
          <Stack direction={{ base: "column", md: "row" }} spacing={2}>
            <Button colorScheme="purple" minH="44px" onClick={() => fileRef.current.click()}>Choose Excel file</Button>
            <Button variant="outline" colorScheme="orange" minH="44px" onClick={() => useSample(1)}>Use SAMPLE file (rev 1)</Button>
            <Button variant="outline" colorScheme="orange" minH="44px" onClick={() => useSample(2)}>Use SAMPLE corrected file (rev 2)</Button>
          </Stack>
        </Section>
      )}
      {step === 2 && sheet && (
        <Section title="3. Map Excel columns" subtitle={`${file.name} · sheet "${sheet.sheet}" · ${fmtNum(sheet.rows.length)} rows`}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {FIELDS.map((f) => (
              <Box key={f.key}>
                <Text fontSize="xs" color="gray.600" mb={1}>{f.label}{f.required ? " *" : ""}</Text>
                <Select size="sm" h="40px" value={mapping[f.key] || ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}>
                  <option value="">— not in file —</option>
                  {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </Box>
            ))}
          </SimpleGrid>
          {missing.length ? <Text mt={3} fontSize="sm" color="red.600">Missing required columns: {missing.join(", ")}</Text> : null}
          <Flex gap={2} mt={4}><Button onClick={() => setStep(1)}>Back</Button><Button colorScheme="purple" isDisabled={!!missing.length} onClick={() => setStep(3)}>Run dry run</Button></Flex>
        </Section>
      )}
      {step >= 3 && result && (
        <>
          <Box p={3} mb={3} bg="purple.50" borderRadius="md" fontSize="sm">
            File auditor(s): <b>{result.summary.auditors.join(", ") || "—"}</b> · <b>{fmtNum(result.summary.allotted_valid)}</b> articles would count as allotted (Effective = Y and valid). {fmtNum(result.summary.not_effective)} rows have Effective = N: not auditable, never allotted. Stock columns in the file are ignored.
          </Box>
          <StatGrid cols={{ base: 2, md: 4, lg: 5 }}>
            <StatCard label="Rows" c={result.summary.total} />
            <StatCard label="Auditable (Effective Y)" c={result.summary.effective} accent={BRAND.purple} />
            <StatCard label="Not auditable (N)" c={result.summary.not_effective} accent="gray.300" />
            <StatCard label="Valid" c={result.summary.valid} accent="green.400" />
            <StatCard label="Invalid" c={result.summary.invalid} accent="red.400" />
            <StatCard label="Unmapped employees" c={result.summary.unmapped_employees} />
            <StatCard label="Unmapped articles" c={result.summary.unmapped_articles} />
            <StatCard label="Duplicates" c={result.summary.duplicates} />
            <StatCard label="Multiple employees" c={result.summary.conflicts} />
            <StatCard label="Branch errors" c={result.summary.branch_errors} />
          </StatGrid>
          <Section title="Revision comparison" subtitle="Against the latest accepted allotment for this cycle and branch (sample)">
            <Checkbox isChecked={complete} onChange={(e) => setComplete(e.target.checked)} colorScheme="purple" mb={2}>
              This file is a COMPLETE REPLACEMENT (only then can missing rows count as removed)
            </Checkbox>
            <Box mb={3} maxW="360px">
              <Select size="sm" h="40px" value={scopeMode} onChange={(e) => setScopeMode(e.target.value)} isDisabled={!complete}>
                <option value="auditor">Replaces only this file's auditor(s)</option>
                <option value="branch">Replaces the whole branch's allotment</option>
              </Select>
            </Box>
            <SimpleGrid columns={{ base: 2, md: 5 }} spacing={2}>
              <StatCard label="Added" c={diff.added.length} accent="green.400" />
              <StatCard label="Reassigned" c={diff.reassigned.length} accent={BRAND.orange} />
              <StatCard label="Unchanged" c={diff.unchanged.length} accent="gray.300" />
              <StatCard label="Removed" c={diff.removed.length} accent="red.400" />
              <StatCard label="Not in file (kept)" c={diff.not_in_file.length} accent="gray.300" />
            </SimpleGrid>
          </Section>
          <Section title="Rows">
            <Flex gap={2} wrap="wrap" mb={3}>
              {[["invalid", `Invalid (${result.summary.invalid})`], ["not_auditable", `Not auditable (${result.summary.not_effective})`], ["valid", `Auditable & valid (${result.summary.allotted_valid})`], ["all", `All (${result.summary.total})`]].map(([k, label]) => (
                <Button key={k} size="sm" minH="36px" colorScheme="purple" variant={rowFilter === k ? "solid" : "outline"} onClick={() => { setRowFilter(k); setRowPage(1); }}>{label}</Button>
              ))}
            </Flex>
            {(() => {
              const list = result.rows.filter((r) => rowFilter === "all" || (rowFilter === "invalid" ? r.errors.length : rowFilter === "not_auditable" ? !r.effective && !r.errors.length : r.effective && !r.errors.length));
              const size = 15;
              const pages = Math.max(1, Math.ceil(list.length / size));
              return (
                <DataList
                  rows={list.slice((rowPage - 1) * size, rowPage * size)} page={rowPage} pages={pages} total={list.length} onPage={setRowPage}
                  keyOf={(r) => r.line} empty="No rows in this group"
                  columns={[
                    { key: "line", label: "Line", primary: true, render: (r) => <span>Line {r.line} · {r.article || "—"}</span> },
                    { key: "state", label: "Result", mobileRight: true, render: (r) => (r.errors.length ? <Badge colorScheme="red">Invalid</Badge> : !r.effective ? <Badge colorScheme="gray">Not auditable</Badge> : r.warnings.length ? <Badge colorScheme="orange">Warning</Badge> : <Badge colorScheme="green">Valid</Badge>) },
                    { key: "node", label: "Node", render: (r) => r.node || "—" },
                    { key: "employee", label: "Auditor", render: (r) => `${r.employee}${r.employee_name ? ` · ${r.employee_name}` : ""}` },
                    { key: "article_name", label: "Article name", render: (r) => r.article_name || "—" },
                    { key: "branch", label: "Branch", render: (r) => r.branch },
                    { key: "reason", label: "Effective reason", render: (r) => r.reason || "—" },
                    { key: "errors", label: "Problems", render: (r) => <Text as="span" fontSize="xs" color={r.errors.length ? "red.600" : "orange.600"}>{[...r.errors, ...r.warnings].join("; ") || "—"}</Text> },
                  ]}
                />
              );
            })()}
          </Section>
          <Section title="5. Confirm import">
            <Text fontSize="sm" mb={3}>Only valid, auditable (Effective = Y) rows would be imported as allotted, as revision {complete ? "(complete replacement)" : "(corrections)"}. Approved incentives are never changed silently: a changed allotment sends affected incentives back for reapproval.</Text>
            <Flex gap={2} wrap="wrap">
              <Button onClick={() => setStep(2)}>Back to mapping</Button>
              <PreviewButton colorScheme="purple" label="Confirm import">Confirm import ({fmtNum(result.summary.allotted_valid)} auditable articles)</PreviewButton>
              <Button variant="outline" onClick={() => go("allotment-history")}>Upload history</Button>
            </Flex>
          </Section>
        </>
      )}
    </Screen>
  );
}

export const ImportValidation = () => <AllotmentImport startAt={3} />;

export function AllotmentHistory() {
  const s = useLoad(() => adapter.allotmentUploads(), []);
  return (
    <Screen title="Excel Upload & Allotment Revision History" subtitle="Every upload is kept with its original file. Revisions never delete audit history." back={{ label: "Allotment report", path: "allotment" }}>
      <Loader s={s}>
        {(rows) => (
          <DataList
            rows={rows} keyOf={(r) => r.upload_id}
            columns={[
              { key: "file", label: "File", primary: true, render: (r) => <span>{r.file}</span> },
              { key: "store", label: "Branch", primary: true, render: (r) => <Text as="span" fontSize="xs" color="gray.500">{r.store} · revision {r.revision}</Text> },
              { key: "status", label: "Status", mobileRight: true, render: (r) => <Pill color="orange">{r.status}</Pill> },
              { key: "mode", label: "Mode", render: (r) => r.mode },
              { key: "rows", label: "Rows", numeric: true, render: (r) => fmtNum(r.rows) },
              { key: "added", label: "Added", numeric: true, render: (r) => fmtNum(r.added) },
              { key: "reassigned", label: "Reassigned", numeric: true, render: (r) => fmtNum(r.reassigned) },
              { key: "removed", label: "Removed", numeric: true, render: (r) => fmtNum(r.removed) },
              { key: "unchanged", label: "Unchanged", numeric: true, render: (r) => fmtNum(r.unchanged) },
              { key: "at", label: "Uploaded", render: (r) => `${fmtDateTime(r.at)} · ${r.by}` },
              { key: "file_dl", label: "Original file", render: () => <PreviewButton size="xs" variant="link" colorScheme="purple" label="Download original">Download</PreviewButton> },
            ]}
          />
        )}
      </Loader>
    </Screen>
  );
}
