import React, { useEffect, useState } from "react";
import { Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useStockAudit } from "../context";
import { adapter, D } from "../data/adapter";
import { consolidatedPdf, storePdf } from "../pdf/reports";
import { Section, SelectField, BRAND } from "../ui";
import { Screen, StoreSelect, CycleSelect, DateSelect, NoAccess } from "./common";
import { P } from "../permissions";

const logoUrl = () => (typeof window !== "undefined" && window.__SA_LOGO__) || "/assets/dnds-logo.png";

async function loadLogo() {
  try {
    const blob = await (await fetch(logoUrl())).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  } catch (e) {
    return null;
  }
}

/** Assemble report data for a date. Only today can show cycle totals in the preview. */
async function reportData(state, date) {
  const stores = await adapter.stores({ state });
  const standings = await adapter.standings({ state });
  return {
    date,
    cycle: D.CYCLES[0].name,
    generatedAt: new Date().toISOString(),
    lastSync: D.LAST_SYNC,
    // A past date needs the history kept by the sync; the preview has none, so
    // cumulative totals print as Unavailable rather than today's figures.
    historical: date !== D.TODAY,
    stores,
    standings,
    sample: true,
  };
}

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
  const [date, setDate] = useState(D.TODAY);
  const [outlet, setOutlet] = useState("7");
  const [busy, setBusy] = useState(null);
  if (!can(P.HR_PDF)) return <Screen title="HR Daily PDF Reports"><NoAccess what="HR daily reports" /></Screen>;
  const run = async (key, fn) => {
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
    <Screen title="HR Daily PDF Reports" subtitle="Select date → download PDF → share in the team groups. PDF only." sampleNote="SAMPLE PDFs. They contain no salary or individual incentive amounts.">
      <Section title="1. Select">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <DateSelect value={date} onChange={setDate} />
          <CycleSelect />
          <StoreSelect value={outlet} onChange={setOutlet} allowAll={false} label="Branch (store PDF)" />
        </SimpleGrid>
        {date !== D.TODAY ? <Text fontSize="xs" color="orange.600" mt={2}>Past date: daily activity is shown; cycle totals print as Unavailable unless they can be rebuilt from sync history.</Text> : null}
      </Section>
      <Section title="2. Download">
        <Stack spacing={3}>
          <Button size="lg" minH="52px" bg={BRAND.purple} color="white" _hover={{ opacity: 0.9 }} isLoading={busy === "all"} onClick={() => run("all", () => makeConsolidated(dataState, date))}>Download consolidated PDF (all five stores)</Button>
          <Button size="lg" minH="52px" bg={BRAND.orange} color="white" _hover={{ opacity: 0.9 }} isLoading={busy === "one"} onClick={() => run("one", () => makeStore(dataState, date, outlet))}>Download store PDF · {D.STORES.find((s) => String(s.outlet_id) === outlet).name}</Button>
          <Button size="lg" minH="52px" variant="outline" colorScheme="purple" isLoading={busy === "five"} onClick={() => run("five", () => Promise.all(D.STORES.map((s) => makeStore(dataState, date, s.outlet_id))))}>Download all five store PDFs</Button>
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

function PdfPreview({ title, build, deps }) {
  const [url, setUrl] = useState(null);
  const [name, setName] = useState("");
  useEffect(() => {
    let u = null;
    build().then(({ doc, name: n }) => { u = URL.createObjectURL(doc.output("blob")); setUrl(u); setName(n); });
    return () => u && URL.revokeObjectURL(u);
  }, deps); // eslint-disable-line
  return (
    <Screen title={title} back={{ label: "HR daily reports", path: "hr-reports" }} actions={url ? <Button as="a" href={url} download={name} size="sm" colorScheme="purple" minH="38px">Download</Button> : null}>
      {url ? (
        <>
          <Button as="a" href={url} target="_blank" rel="noreferrer" size="sm" mb={3} variant="outline" colorScheme="purple" display={{ base: "inline-flex", md: "none" }}>Open PDF</Button>
          <Box as="iframe" title={title} src={url} w="100%" h={{ base: "70vh", md: "80vh" }} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white" />
        </>
      ) : <Text fontSize="sm" color="gray.500">Building the PDF…</Text>}
    </Screen>
  );
}

export function ConsolidatedPdfPreview() {
  const { dataState } = useStockAudit();
  return <PdfPreview title="Consolidated Daily PDF – Preview" build={() => makeConsolidated(dataState, D.TODAY)} deps={[dataState]} />;
}

export function StorePdfPreview() {
  const { dataState, params } = useStockAudit();
  const outlet = params.outlet || 7;
  return <PdfPreview title="Store Daily PDF – Preview" build={() => makeStore(dataState, D.TODAY, outlet)} deps={[dataState, outlet]} />;
}
