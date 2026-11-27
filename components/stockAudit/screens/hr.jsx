import React, { useEffect, useState } from "react";
import { Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useStockAudit } from "../context";
import { adapter, isLive } from "../data/adapter";
import { consolidatedPdf, storePdf } from "../pdf/reports";
import { Section, SelectField, BRAND } from "../ui";
import { Screen, StoreSelect, CycleSelect, DateSelect, NoAccess, useMeta } from "./common";
import { P } from "../permissions";

/** In the published preview, browser downloads are blocked: buttons open pre-built SAMPLE PDFs instead. */
const samplePdfs = () => (typeof window !== "undefined" && window.__SA_SAMPLE_PDFS__) || null;

const logoUrl = () => (typeof window !== "undefined" && window.__SA_LOGO__) || "/assets/dnds-logo.png";

async function loadLogo() {
  try {
    const blob = await (await fetch(logoUrl())).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  } catch (e) {
    return null;
  }
}

/**
 * Report data for a date: from the backend in DNDS Connect (team figures
 * only - the API strips individual incentive amounts), sample in the preview.
 */
const reportData = (state, date) => adapter.hrReport({ state, date });

const fileDate = (d) => d.split("-").reverse().join("-");

async function makeConsolidated(state, date) {
  const [data, logo] = await Promise.all([reportData(state, date), loadLogo()]);
  return { doc: consolidatedPdf(data, { logo }), name: `Stock-Audit-All-Stores-${fileDate(date)}.pdf` };
}
async function makeStore(state, date, outletId) {
  const [data, logo] = await Promise.all([reportData(state, date), loadLogo()]);
  const store = data.stores.find((s) => s.outlet_id === Number(outletId));
  const standing = data.standings.find((s) => s.store.outlet_id === Number(outletId));
  return { doc: storePdf({ ...data, store, standing }, { logo }), name: `Stock-Audit-${store.name.replace(/\s+/g, "-")}-${fileDate(date)}.pdf` };
}

export function HrDownload() {
  const { dataState, can, go } = useStockAudit();
  const meta = useMeta();
  const [date, setDate] = useState(meta.today);
  const [outlet, setOutlet] = useState(String((meta.stores[0] || { outlet_id: 7 }).outlet_id));
  const storeName = (meta.stores.find((s) => String(s.outlet_id) === outlet) || { name: "—" }).name;
  const [busy, setBusy] = useState(null);
  if (!can(P.HR_PDF)) return <Screen title="HR Daily PDF Reports"><NoAccess what="HR daily reports" /></Screen>;
  const pdfs = samplePdfs();
  const run = async (key, fn) => {
    if (pdfs) return;
    setBusy(key);
    try {
      const out = await fn();
      (Array.isArray(out) ? out : [out]).forEach(({ doc, name }) => doc.save(name));
    } catch (e) {
      toast.error(`Could not build the PDF: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen title="HR Daily PDF Reports" subtitle="Select date → download PDF → share in the team groups. PDF only. No salary or individual incentive amounts." sampleNote="SAMPLE PDFs. They contain no salary or individual incentive amounts.">
      <Section title="1. Select">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <DateSelect value={date} onChange={setDate} />
          <CycleSelect />
          <StoreSelect value={outlet} onChange={setOutlet} allowAll={false} label="Branch (store PDF)" />
        </SimpleGrid>
        {date !== meta.today ? <Text fontSize="xs" color="orange.600" mt={2}>{isLive() ? "Past date: figures as they stood at the end of that day (audits and recounts up to then); the allotment shown is the current revision." : "Past date: daily activity is shown; cycle totals print as Unavailable unless they can be rebuilt from sync history."}</Text> : null}
      </Section>
      <Section title="2. Download">
        <Stack spacing={3}>
          {pdfs ? (
            <>
              <Text fontSize="xs" color="gray.500">Preview: the buttons open pre-built SAMPLE PDFs (ECR for the store report). In DNDS Connect they download the PDF for the date and branch selected.</Text>
              <Button as="a" href={pdfs.all} target="_blank" rel="noreferrer" size="lg" minH="52px" bg={BRAND.purple} color="white" _hover={{ opacity: 0.9 }}>Open consolidated PDF (all five stores)</Button>
              <Button as="a" href={pdfs.store} target="_blank" rel="noreferrer" size="lg" minH="52px" bg={BRAND.orange} color="white" _hover={{ opacity: 0.9 }}>Open store PDF (sample: ECR)</Button>
              <Button as="a" href={pdfs.allBefore} target="_blank" rel="noreferrer" size="lg" minH="52px" variant="outline" colorScheme="purple">Open consolidated PDF before allotment import</Button>
            </>
          ) : (
            <>
              <Button size="lg" minH="52px" bg={BRAND.purple} color="white" _hover={{ opacity: 0.9 }} isLoading={busy === "all"} onClick={() => run("all", () => makeConsolidated(dataState, date))}>Download consolidated PDF (all five stores)</Button>
              <Button size="lg" minH="52px" bg={BRAND.orange} color="white" _hover={{ opacity: 0.9 }} isLoading={busy === "one"} onClick={() => run("one", () => makeStore(dataState, date, outlet))}>Download store PDF · {storeName}</Button>
              <Button size="lg" minH="52px" variant="outline" colorScheme="purple" isLoading={busy === "five"} onClick={() => run("five", () => Promise.all(meta.stores.map((s) => makeStore(dataState, date, s.outlet_id))))}>Download all {meta.stores.length} store PDFs</Button>
            </>
          )}
        </Stack>
      </Section>
      <Section title="3. Share">
        <Text fontSize="sm">Share each PDF in the respective team group. Nothing is sent automatically.</Text>
        <Flex gap={2} mt={3} wrap="wrap">
          <Button size="sm" variant="link" color={BRAND.purple} onClick={() => go("hr-pdf-all")}>Preview consolidated PDF</Button>
          <Button size="sm" variant="link" color={BRAND.purple} onClick={() => go("hr-pdf-store", { outlet })}>Preview store PDF</Button>
        </Flex>
      </Section>
    </Screen>
  );
}

function PdfPreview({ title, build, deps, sample }) {
  const [url, setUrl] = useState(sample || null);
  const [name, setName] = useState("");
  useEffect(() => {
    if (sample) return undefined;
    let u = null;
    build().then(({ doc, name: n }) => { u = URL.createObjectURL(doc.output("blob")); setUrl(u); setName(n); });
    return () => u && URL.revokeObjectURL(u);
  }, deps); // eslint-disable-line
  return (
    <Screen title={title} back={{ label: "HR daily reports", path: "hr-reports" }} actions={url && !sample ? <Button as="a" href={url} download={name} size="sm" colorScheme="purple" minH="38px">Download</Button> : null}>
      {url ? (
        <>
          <Button as="a" href={url} target="_blank" rel="noreferrer" size="sm" mb={3} variant="outline" colorScheme="purple" display={sample ? "inline-flex" : { base: "inline-flex", md: "none" }}>Open PDF</Button>
          <Box as="iframe" title={title} src={url} w="100%" h={{ base: "70vh", md: "80vh" }} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white" />
        </>
      ) : <Text fontSize="sm" color="gray.500">Building the PDF…</Text>}
    </Screen>
  );
}

export function ConsolidatedPdfPreview() {
  const { dataState, meta } = useStockAudit();
  const pdfs = samplePdfs();
  return <PdfPreview title="Consolidated Daily PDF – Preview" build={() => makeConsolidated(dataState, meta.today)} deps={[dataState]} sample={pdfs ? (dataState === "allotment" ? pdfs.all : pdfs.allBefore) : null} />;
}

export function StorePdfPreview() {
  const { dataState, params, meta } = useStockAudit();
  const outlet = params.outlet || (meta.stores[0] || { outlet_id: 7 }).outlet_id;
  const pdfs = samplePdfs();
  return <PdfPreview title="Store Daily PDF – Preview" build={() => makeStore(dataState, meta.today, outlet)} deps={[dataState, outlet]} sample={pdfs ? (dataState === "allotment" ? pdfs.store : pdfs.storeBefore) : null} />;
}
