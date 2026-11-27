import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useStockAudit } from "../context";
import { D, adapter, isLive } from "../data/adapter";
import { readAuditorFile, validateBatch } from "../data/bulkAllotment";
import { sampleBulkBatch } from "../data/sampleBulk";
import { DataList, KV, Pill, Section, StatCard, StatGrid, BRAND, fmtNum, fmtPct } from "../ui";
import { Screen, CycleSelect, useMeta } from "./common";

const STATUS = {
  VALID: ["green", "Ready"],
  WARNINGS: ["orange", "Ready, with warnings"],
  CONFLICT: ["red", "Conflict"],
  REJECTED: ["red", "Rejected"],
  ALREADY_IMPORTED: ["gray", "Already imported"],
};
const Status = ({ s }) => <Badge colorScheme={STATUS[s][0]} textTransform="none" whiteSpace="normal">{STATUS[s][1]}</Badge>;
const STEPS = ["Season", "Upload all CSV files", "Validate", "Confirm import"];

function Steps({ at }) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2} mb={4}>
      {STEPS.map((s, i) => (
        <Flex key={s} align="center" gap={2} px={3} py={2} borderRadius="md" fontSize="xs" fontWeight={600} bg={i === at ? BRAND.purple : i < at ? "purple.50" : "white"} color={i === at ? "white" : i < at ? BRAND.purple : "gray.500"} border="1px solid" borderColor={i <= at ? BRAND.purple : "gray.200"}>
          <Box as="span" fontSize="sm">{i < at ? "✓" : i + 1}</Box>{s}
        </Flex>
      ))}
    </SimpleGrid>
  );
}

/**
 * Screens 6 and 7: bulk import of RetailPilot allotment CSVs (one file per
 * auditor, as exported). Season → upload all files → validate → confirm.
 */
export function BulkAllotmentImport({ startWithSample = false }) {
  const { go, seasonInfo } = useStockAudit();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]); // { name, text }
  const [sampleCtx, setSampleCtx] = useState(null);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef();
  const meta = useMeta();
  const live = isLive();
  // the selected season (current by default): its internal store cycles take the allotment
  const cycle = seasonInfo ? { name: seasonInfo.name, period_code: seasonInfo.period_code } : meta.cycles[0] || { name: "—", period_code: null };
  const [server, setServer] = useState(null); // live: the backend's validation
  const [busy, setBusy] = useState(false);

  const useSample = () => {
    const b = sampleBulkBatch();
    setFiles(b.files);
    setSampleCtx(b.ctx);
    setStep(2);
  };
  useEffect(() => { if (startWithSample) useSample(); }, []); // eslint-disable-line

  const addFiles = async (list) => {
    const picked = [...list].filter((f) => /\.csv$/i.test(f.name) || f.type === "text/csv");
    if (!picked.length) return toast.error("Choose the RetailPilot CSV files (assortment-effective-….csv)");
    const read = await Promise.all(picked.map(async (f) => ({ name: f.name, text: await f.text() })));
    const all = [...files, ...read];
    setFiles(all);
    if (live) {
      // LIVE: the backend validates against the season's store cycles, Branch Master, mapping, earlier imports and audits
      setBusy(true);
      try {
        setServer(fromServer(await adapter.validateAllotment({ period_code: cycle.period_code, files: all })));
      } catch (e) {
        toast.error(e.message || "Validation failed");
      } finally {
        setBusy(false);
      }
    } else if (!sampleCtx) setSampleCtx(sampleBulkBatch().ctx);
    setStep(2);
  };

  const local = useMemo(() => (!live && files.length && sampleCtx ? validateBatch(files.map((f) => readAuditorFile(f.name, f.text)), sampleCtx) : null), [files, sampleCtx, live]);
  const result = live ? server : local;
  const confirm = async () => {
    if (!live) return setDone(true);
    setBusy(true);
    try {
      await adapter.confirmAllotment(server.batch_id);
      toast.success("Allotment imported");
      setDone(true);
    } catch (e) {
      toast.error(e.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };
  const unmapped = result ? result.files.filter((f) => f.status !== "REJECTED" && f.auditor_id && !f.employee) : [];

  return (
    <Screen
      title={startWithSample ? "Allotment Import – Validation" : "Allotment Import – Bulk CSV"}
      subtitle="RetailPilot 'assortment-effective' CSVs exactly as exported: one file per auditor. Store and auditor are read from each file. Only Effective = Y articles are allotted."
      back={{ label: "Allotment report", path: "allotment" }}
      sampleNote={live ? null : "SAMPLE masters, earlier imports and audits. Your own RetailPilot CSVs can be uploaded here too: they are read in your browser only, nothing is sent or saved."}
    >
      <Steps at={done ? 4 : step} />

      {step === 0 && (
        <Section title="1. Season">
          <Stack spacing={3} maxW="420px">
            <CycleSelect />
            <Text fontSize="xs" color="gray.500">Stores in this season: {meta.stores.map((s) => s.name).join(", ") || "—"}. The warehouse is not part of the programme.</Text>
            {!cycle.period_code && live ? <Text fontSize="sm" color="red.600">No season yet: an administrator creates it in Season Master.</Text> : null}
            <Button colorScheme="purple" minH="48px" isDisabled={live && !cycle.period_code} onClick={() => setStep(1)}>Continue</Button>
          </Stack>
        </Section>
      )}

      {step === 1 && (
        <Section title={`2. Upload all CSV files · ${cycle.name}`}>
          <input ref={input} type="file" multiple accept=".csv,text/csv,text/comma-separated-values" style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <Box
            border="2px dashed" borderColor={drag ? BRAND.purple : "purple.200"} bg={drag ? "purple.50" : "white"} borderRadius="lg" p={{ base: 6, md: 10 }} textAlign="center" cursor="pointer"
            onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          >
            <Text fontSize="3xl">📂</Text>
            <Text fontWeight={700} color={BRAND.purple}>Choose all the auditor CSV files</Text>
            <Text fontSize="sm" color="gray.600" mt={1}>Select them together (or drop them here). Do not rename or edit them.</Text>
          </Box>
          <Flex mt={3} gap={2} direction={{ base: "column", md: "row" }}>
            <Button colorScheme="purple" minH="48px" onClick={() => input.current.click()}>Choose files</Button>
            {live ? null : <Button variant="outline" colorScheme="orange" minH="48px" onClick={useSample}>Use the SAMPLE upload (13 files)</Button>}
            {busy ? <Text fontSize="sm" color="gray.600" alignSelf="center">Validating…</Text> : null}
          </Flex>
        </Section>
      )}

      {step >= 2 && result && !done && (
        <>
          {!result.canConfirm && result.summary.conflict_files ? (
            <Box p={3} mb={3} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" fontSize="sm">
              <b>Import blocked:</b> {result.conflicts.length} article(s) are allotted to two auditors in the same store. Correct the allotment in RetailPilot, export those auditors again and upload.
            </Box>
          ) : null}
          <StatGrid cols={{ base: 2, md: 4, lg: 5 }}>
            <StatCard label="Files" c={result.summary.files} sub={`${result.summary.stores} stores · ${result.summary.auditors} auditors`} />
            <StatCard label="Ready to import" c={result.summary.importable} accent="green.400" sub={result.summary.revisions ? `${result.summary.revisions} corrected (new revision)` : null} />
            <StatCard label="Rejected" c={result.summary.rejected} accent="red.400" />
            <StatCard label="Conflicts" c={result.conflicts.length} accent="red.400" sub={`${result.summary.conflict_files} file(s)`} />
            <StatCard label="Already imported" c={result.summary.already_imported} accent="gray.300" sub="Identical to the last import: skipped" />
            <StatCard label="Auditable articles" c={result.summary.auditable} accent={BRAND.purple} sub="Effective = Y, ready files" />
            <StatCard label="Not auditable" c={result.summary.not_auditable} accent="gray.300" sub="Effective = N" />
            <StatCard label="Row problems" c={result.summary.line_errors} />
            <StatCard label="Unmapped auditors" c={result.summary.unmapped} accent={BRAND.orange} />
            <StatCard label="Rows read" c={result.summary.rows} />
          </StatGrid>

          {unmapped.length ? (
            <Section title="Unmapped RetailPilot auditors" subtitle="Their allotment can be imported; their counts earn nothing until they are mapped to an employee." actions={<Button size="sm" variant="outline" colorScheme="purple" onClick={() => go("mapping")}>Open employee mapping</Button>}>
              <Stack spacing={1}>
                {unmapped.map((f) => <KV key={f.name} k={<span>{f.auditor_name || "—"} <Text as="span" fontFamily="mono" fontSize="xs">{f.auditor_id}</Text></span>} v={f.outlet ? f.outlet.name : f.store_id} />)}
              </Stack>
            </Section>
          ) : null}

          <Section title="3. Validation by file" subtitle="Tap a file for its problems, revision changes and audit matching (Store + Auditor + Article)." actions={<Button size="sm" variant="outline" colorScheme="purple" onClick={() => input.current && input.current.click()}>Add more files</Button>}>
            <input ref={input} type="file" multiple accept=".csv,text/csv,text/comma-separated-values" style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <DataList
              rows={[...result.files].sort((a, b) => ["CONFLICT", "REJECTED", "WARNINGS", "VALID", "ALREADY_IMPORTED"].indexOf(a.status) - ["CONFLICT", "REJECTED", "WARNINGS", "VALID", "ALREADY_IMPORTED"].indexOf(b.status))}
              keyOf={(f) => f.name}
              renderDetail={(f) => (
                <Box fontSize="sm">
                  {[...f.issues, ...f.warnings].map((m) => <Text key={m} color={f.issues.includes(m) ? "red.600" : "orange.600"}>• {m}</Text>)}
                  {f.ok ? (
                    <>
                      <KV k="Revision" v={f.revision > 1 ? `Revision ${f.revision} (replaces this auditor's allotment only)` : "First import for this auditor"} />
                      {f.diff ? <KV k="Changes" v={`+${f.diff.added} added · −${f.diff.removed} removed · ${f.diff.unchanged} unchanged`} /> : null}
                      <KV k="Audited by this auditor" v={fmtNum(f.match.audited_own)} />
                      <KV k="Audited by another auditor" v={fmtNum(f.match.audited_by_other)} />
                      <KV k="Pending" v={fmtNum(f.match.pending)} />
                      {f.match.audited_not_allotted ? <KV k="Counted but not allotted to anyone" v={fmtNum(f.match.audited_not_allotted)} /> : null}
                      {f.lines.filter((l) => l.errors.length).slice(0, 8).map((l) => <Text key={l.line} fontSize="xs" color="red.600">Line {l.line} · {l.article_id || "—"}: {l.errors.join("; ")}</Text>)}
                    </>
                  ) : null}
                </Box>
              )}
              columns={[
                { key: "who", label: "Auditor", primary: true, render: (f) => (f.auditor_id ? <span>{f.auditor_name || f.auditor_id}{!f.employee && f.ok ? <Badge ml={1} colorScheme="orange" fontSize="0.6em">unmapped</Badge> : null}</span> : <Text as="span" color="gray.500">Unknown</Text>) },
                { key: "file", label: "File", primary: true, render: (f) => <Text as="span" fontSize="xs" color="gray.500" wordBreak="break-all">{f.outlet ? f.outlet.name : f.store_id || "—"} · {f.name}</Text> },
                { key: "status", label: "Status", mobileRight: true, render: (f) => <Status s={f.status} /> },
                { key: "auditable", label: "Auditable (Y)", numeric: true, render: (f) => (f.ok ? fmtNum(f.auditable) : "—") },
                { key: "na", label: "Not auditable (N)", numeric: true, render: (f) => (f.ok ? fmtNum(f.not_auditable) : "—") },
                { key: "rev", label: "Revision", numeric: true, render: (f) => (f.ok ? f.revision : "—") },
                { key: "audited", label: "Audited so far", numeric: true, render: (f) => (f.ok ? fmtNum(f.match.audited_own) : "—") },
              ]}
            />
          </Section>

          <Section title="4. Confirm import">
            <Text fontSize="sm" mb={3}>
              {fmtNum(result.summary.importable)} file(s), {fmtNum(result.summary.auditable)} auditable articles. Rejected and already-imported files are skipped. Audit history and approved incentives are never changed silently: an incentive affected by a corrected allotment goes back for reapproval.
            </Text>
            <Flex gap={2} direction={{ base: "column", md: "row" }}>
              <Button colorScheme="purple" minH="48px" isDisabled={!result.canConfirm || busy} isLoading={busy} onClick={confirm}>Confirm import</Button>
              <Button variant="outline" minH="48px" onClick={() => { if (live && server) adapter.discardAllotment(server.batch_id).catch(() => {}); setFiles([]); setServer(null); setStep(1); }}>Start again</Button>
            </Flex>
            {!result.canConfirm ? <Text fontSize="xs" color="red.600" mt={2}>Resolve the conflicts first.</Text> : null}
          </Section>
        </>
      )}

      {done && result ? <ImportResult result={result} go={go} live={live} /> : null}
    </Screen>
  );
}

/** The backend's validation, in the shape this screen draws. */
function fromServer(v) {
  return {
    batch_id: v.batch_id,
    summary: v.summary,
    canConfirm: v.canConfirm,
    conflicts: v.conflicts || [],
    files: v.files.map((f) => ({
      ...f,
      ok: f.status !== "REJECTED",
      outlet: f.store ? { name: f.store } : null,
      employee: f.employee_id ? { employee_id: f.employee_id } : null,
      match: f.match || { audited_own: 0, audited_by_other: 0, audited_not_allotted: 0, pending: f.auditable },
      lines: (f.errors || []).map((e) => ({ line: e.line, article_id: e.article_id, errors: e.errors })),
    })),
  };
}

function ImportResult({ result, go, live }) {
  const imported = result.files.filter((f) => f.status === "VALID" || f.status === "WARNINGS");
  return (
    <>
      <Box p={3} mb={3} bg="green.50" border="1px solid" borderColor="green.200" borderRadius="md" fontSize="sm">
        {live ? <><b>Imported.</b> Each file is saved as that auditor's revision (earlier revisions kept) and progress is recalculated.</> : <><b>Preview of the result.</b> In DNDS Connect this import would now be saved as a revision, with the original files kept, and progress recalculated. In the preview nothing is saved.</>}
      </Box>
      <Section title="Employee progress after import" subtitle="Allotted (Effective = Y) vs audited by the same auditor (Store + Auditor + Article)">
        <DataList rows={imported} keyOf={(f) => f.name} columns={[
          { key: "who", label: "Auditor", primary: true, render: (f) => f.auditor_name || f.auditor_id },
          { key: "store", label: "Store", primary: true, render: (f) => <Text as="span" fontSize="xs" color="gray.500">{f.outlet.name} · revision {f.revision}</Text> },
          { key: "pct", label: "Completion", numeric: true, mobileRight: true, render: (f) => <b>{fmtPct(f.auditable ? (f.match.audited_own * 100) / f.auditable : null)}</b> },
          { key: "allotted", label: "Allotted", numeric: true, render: (f) => fmtNum(f.auditable) },
          { key: "audited", label: "Audited", numeric: true, render: (f) => fmtNum(f.match.audited_own) },
          { key: "pending", label: "Pending", numeric: true, render: (f) => fmtNum(f.match.pending) },
        ]} />
      </Section>
      <Section title="Recalculated after import">
        <Stack fontSize="sm" spacing={1}>
          <Text>✓ Employee progress: allotted, pending and completion %</Text>
          <Text>✓ Store completion and the company dashboard</Text>
          <Text>✓ Completion-within-deadline KPIs (Supervisor ₹200, Store Manager ₹600)</Text>
          <Text>✓ Premier League completion points</Text>
          <Text>✓ Article eligibility: audits by the allotted auditor become eligible; audits by someone else go to eligibility review</Text>
        </Stack>
        <Flex gap={2} mt={3} wrap="wrap">
          <Button size="sm" colorScheme="purple" onClick={() => go("employees")}>Employee performance</Button>
          <Button size="sm" variant="outline" colorScheme="purple" onClick={() => go("allotment-history")}>Upload history</Button>
        </Flex>
      </Section>
    </>
  );
}

export const BulkImportValidation = () => <BulkAllotmentImport startWithSample />;
