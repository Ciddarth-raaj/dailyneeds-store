import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Select,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import WarehouseFlowHelper from "../../helper/warehouseFlow";
import {
  ageText,
  hasInvoiceNotStarted,
  hasInvoiceStarted,
  sinceLabel,
  docStateText,
  grnStageOf,
  grnStages,
  invoiceLine,
  rowStatus,
  stateText,
  stepRows,
  stepSummary,
} from "../../util/warehouseFlow";
import { compactINR, formatINR } from "../../util/payrollDashboard";

const timeText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));

/** What a row is called when it has no gate pass: its invoice, or its inspection. */
const refText = (r) =>
  r.gate_pass ||
  (r.kind === "document"
    ? `Invoice ${(r.documents && r.documents[0] && r.documents[0].invoice_no) || "(number not read yet)"} · no gate pass`
    : `Inspection ${r.ref}`);

const STATUS_COLOR = {
  "GRN started": "blue",
  "GRN not started": "gray",
  "Not allocated": "gray",
  Allocated: "blue",
  "No inspection yet": "gray",
  "Written off": "red",
  "Invoice not uploaded": "orange",
};

// GRN and Allocation each split into two lists; "all" is both. The rows of
// both carry the same fields (invoices / invoices_grn_started / grn_started);
// for Allocation "started" means allocated.
const SPLIT_LABELS = {
  grn: ["Not started", "Started"],
  allocation: ["Not allocated", "Allocated"],
};
/**
 * GRN is shown stage by stage (RetailPilot's own stages); its filters are All
 * and one per stage that has invoices. Allocation keeps its two-way split.
 */
const grnFilters = (rows) => [
  { key: "all", label: "All", test: () => true },
  ...grnStages(rows).map((st) => ({ key: `stage:${st.state}`, label: st.label, test: (r) => grnStageOf(r) === st.state })),
];
const splitFilters = (stepKey) => {
  const [notYet, done] = SPLIT_LABELS[stepKey] || SPLIT_LABELS.grn;
  return [
    { key: "not_started", label: notYet, test: hasInvoiceNotStarted },
    { key: "started", label: done, test: hasInvoiceStarted },
    { key: "all", label: "All", test: () => true },
  ];
};

/** One half of a split tile (GRN, Allocation): a count that opens its own list. */
const invoicesText = (n) => `${n} invoice${n === 1 ? "" : "s"}`;

function GrnSplit({ step = "GRN", label, invoices, color, onClick }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      w="100%"
      textAlign="left"
      px={2}
      py={1}
      borderRadius="md"
      bg={`${color}.50`}
      _hover={{ boxShadow: "sm", bg: `${color}.100` }}
      aria-label={`${step} ${label.toLowerCase()}: ${invoicesText(invoices)}`}
    >
      <Flex align="baseline" gap={2}>
        <Text fontSize="xl" fontWeight="700" color="gray.800" lineHeight="short">
          {invoices}
        </Text>
        <Text fontSize="xs" color="gray.700" whiteSpace="nowrap">
          {label}
        </Text>
      </Flex>
    </Box>
  );
}

/**
 * One step tile. A built step is a button that opens its list at the side;
 * the GRN tile is split in two, not started and started, each opening its own.
 */
function StepTile({ index, step, summary, rows = [], onSelect }) {
  const built = step.built;
  const split = built && step.ok && Boolean(SPLIT_LABELS[step.key]);
  const [notYetLabel, doneLabel] = SPLIT_LABELS[step.key] || SPLIT_LABELS.grn;
  const stages = step.key === "grn" ? grnStages(rows) : [];
  const clickable = built && !split;
  // Invoices are known once uploaded for the GRN; before that, count gate passes.
  const byGatePass = step.key === "gate_pass" || step.key === "inspection";
  return (
    <Box
      as={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => onSelect() : undefined}
      title={built ? step.hint : undefined}
      textAlign="left"
      px={3}
      py={3}
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      opacity={built ? 1 : 0.6}
      cursor={clickable ? "pointer" : "default"}
      _hover={clickable ? { boxShadow: "md", borderColor: "purple.300" } : undefined}
    >
      <Text fontSize="10px" color="gray.500" fontWeight="600" letterSpacing="wide">
        STEP {index + 1}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        {step.label}
        {split ? (
          <Text as="span" fontWeight="400" color="gray.500">
            {" "}
            · {invoicesText(summary.invoices)}
          </Text>
        ) : null}
      </Text>
      {split && step.key === "grn" ? (
        <Text fontSize="10px" color="gray.500">
          from {summary.gate_passes} gate pass{summary.gate_passes === 1 ? "" : "es"}
        </Text>
      ) : null}
      {!built ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Coming next
        </Text>
      ) : !step.ok ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Not available
        </Text>
      ) : split && step.key === "grn" ? (
        <Flex direction="column" gap={1} mt={1}>
          {stages.length ? (
            stages.map((st) => (
              <GrnSplit
                key={st.state}
                step="GRN"
                label={st.label}
                invoices={st.count}
                color={st.state === "no_template" ? "gray" : st.state === "cost_qc_failed" ? "orange" : "blue"}
                onClick={() => onSelect(`stage:${st.state}`)}
              />
            ))
          ) : (
            <Text fontSize="xs" color="gray.600">
              Nothing here
            </Text>
          )}
        </Flex>
      ) : split ? (
        <Flex direction="column" gap={1} mt={1}>
          <GrnSplit step={step.label} label={notYetLabel} invoices={summary.invoices - summary.invoices_started} color="gray" onClick={() => onSelect("not_started")} />
          <GrnSplit step={step.label} label={doneLabel} invoices={summary.invoices_started} color="blue" onClick={() => onSelect("started")} />
        </Flex>
      ) : (
        <>
          <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
            {byGatePass ? summary.count : summary.invoices}
          </Text>
          <Text fontSize="xs" color="gray.700" fontWeight="600">
            {step.key === "gate_pass"
              ? `gate pass${summary.count === 1 ? "" : "es"}, not inspected`
              : step.key === "inspection"
              ? `gate pass${summary.count === 1 ? "" : "es"} being inspected`
              : `invoice${summary.invoices === 1 ? "" : "s"} · from ${summary.gate_passes} gate pass${summary.gate_passes === 1 ? "" : "es"}`}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {!summary.count ? "Nothing here" : `oldest ${ageText(summary.oldest_hours)}`}
          </Text>
          {summary.over_day ? (
            <Badge mt={1} colorScheme="orange" fontSize="9px">
              {summary.over_day} over 24h
            </Badge>
          ) : null}
        </>
      )}
    </Box>
  );
}

function Field({ label, children }) {
  return (
    <Box>
      <Text fontSize="10px" color="gray.500" fontWeight="600" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800">
        {children || "—"}
      </Text>
    </Box>
  );
}

/** Loads one record for the detail view. */
function useDetail(load, slug) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  useEffect(() => {
    if (!slug) return undefined;
    let live = true;
    setState({ loading: true, error: null, data: null });
    load(slug)
      .then((res) => {
        if (!live) return;
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load it", data: null });
      })
      .catch((err) => live && setState({ loading: false, error: err.message || "Could not load it", data: null }));
    return () => {
      live = false;
    };
  }, [load, slug]);
  return state;
}

function DetailState({ state, children }) {
  if (state.loading) {
    return (
      <Flex minH="200px" align="center" justify="center">
        <Spinner color="purple.500" />
      </Flex>
    );
  }
  if (state.error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription fontSize="sm">{state.error}</AlertDescription>
      </Alert>
    );
  }
  return state.data ? children(state.data) : null;
}

function InspectionCard({ i }) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
      <Flex justify="space-between" align="center" mb={2} gap={2} wrap="wrap">
        <Box>
          <Text fontSize="sm" fontWeight="700">
            Inspection {i.slug}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {[i.supplier_invoice_id ? `Invoice ${i.supplier_invoice_id}` : null, i.invoice_amount === null || i.invoice_amount === undefined ? null : formatINR(i.invoice_amount)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Box>
        <Flex gap={1}>
          <Badge colorScheme={i.state === "WRITTEN_OFF" ? "red" : "blue"}>{stateText(i.state)}</Badge>
        </Flex>
      </Flex>
      <SimpleGrid columns={2} spacing={3}>
        <Field label="Started">{timeText(i.created_at)}</Field>
        <Field label="Last update">{timeText(i.updated_at)}</Field>
        <Field label="PO">{i.po_id}</Field>
        {i.updated_by ? <Field label="Inspected by">{i.updated_by}</Field> : null}
        {i.totals ? (
          <>
            <Field label="Lines">{qty(i.totals.lines)}</Field>
            <Field label="Invoice qty">{qty(i.totals.invoice_qty)}</Field>
            <Field label="Inspected">{qty(i.totals.inspected_qty)}</Field>
            <Field label="Free">{qty(i.totals.free_qty)}</Field>
            <Field label="Rejected">{qty(i.totals.rejected_qty)}</Field>
          </>
        ) : null}
      </SimpleGrid>
    </Box>
  );
}

/** One supplier invoice waiting for (or through) its GRN. */
function DocumentCard({ d }) {
  const started = d.grn_started;
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
      <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="700">
            {d.invoice_no ? `Invoice ${d.invoice_no}` : "Invoice number not read yet"}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Uploaded {timeText(d.uploaded_at)}
            {d.invoice_date ? ` · dated ${new Date(d.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </Text>
        </Box>
        <Flex gap={1} wrap="wrap">
          <Badge colorScheme={d.done ? "green" : started ? "blue" : "gray"}>{d.done ? "GRN done" : started ? "GRN started" : "GRN not started"}</Badge>
          {!d.done && started ? <Badge colorScheme="purple">{docStateText(d.state)}</Badge> : null}
        </Flex>
      </Flex>
      {d.message && !d.done ? (
        <Text fontSize="xs" color="gray.600" mt={2}>
          {d.message}
        </Text>
      ) : null}
    </Box>
  );
}

function DocumentList({ docs, error }) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
        Invoices{docs.length ? ` (${docs.length})` : ""}
      </Text>
      {error ? (
        <Text fontSize="xs" color="orange.600">
          Invoices could not be read from RetailPilot: {error}
        </Text>
      ) : !docs.length ? (
        <Text fontSize="sm" color="gray.600">
          No supplier invoice uploaded yet.
        </Text>
      ) : (
        <Flex direction="column" gap={2}>
          {docs.map((d) => (
            <DocumentCard key={d.slug} d={d} />
          ))}
        </Flex>
      )}
    </Box>
  );
}

/** An invoice with no gate pass: shown from its row, there is nothing more to read. */
function DocumentDetail({ row }) {
  return (
    <Flex direction="column" gap={5} py={2}>
      <Text fontSize="sm" color="gray.600">
        This invoice has no gate pass.
      </Text>
      <DocumentList docs={row.documents || []} error={null} />
    </Flex>
  );
}

/** One GRN'd invoice in allocation: shown from its row, there is nothing more to read. */
function AllocationDetail({ a, storeName }) {
  return (
    <Flex direction="column" gap={5} py={2}>
      <Flex gap={2} wrap="wrap">
        <Badge colorScheme={a.allocated ? "blue" : "gray"}>{a.allocated ? "Allocated" : "Not allocated"}</Badge>
        {a.retries ? <Badge colorScheme="orange">{a.retries} retries</Badge> : null}
        {a.mode_override ? <Badge colorScheme="purple">Mode: {a.mode_override}</Badge> : null}
      </Flex>
      <SimpleGrid columns={2} spacing={4}>
        <Field label="Store">{storeName(a.store)}</Field>
        <Field label="Supplier">{a.supplier_name || a.supplier_id}</Field>
        <Field label="Supplier invoice">{a.invoice_no}</Field>
        <Field label="Invoice date">{a.invoice_date ? new Date(a.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null}</Field>
        <Field label="Value">{a.invoice_amount === null || a.invoice_amount === undefined ? null : formatINR(a.invoice_amount)}</Field>
        <Field label="PO">{a.po}</Field>
        <Field label="GRN entered">{timeText(a.since)}</Field>
        <Field label="Last attempt">{timeText(a.last_attempt)}</Field>
        <Field label="Waiting">{ageText(a.hours)}</Field>
        <Field label="GRN ref">{a.ref}</Field>
      </SimpleGrid>
    </Flex>
  );
}

/** One gate pass in full: vehicle, times, its invoices and its inspection. */
function GatePassDetail({ slug }) {
  const state = useDetail(WarehouseFlowHelper.getGatePass, slug);
  return (
    <DetailState state={state}>
      {(p) => (
        <Flex direction="column" gap={5} py={2}>
          <Flex gap={2} align="center">
            <Badge colorScheme={p.status === "OPEN" ? "purple" : "gray"}>{p.status || "—"}</Badge>
            <Text fontSize="sm" color="gray.600">
              {p.status === "OPEN" ? `open for ${ageText(p.open_hours)}` : `was in for ${ageText(p.open_hours)}`}
            </Text>
          </Flex>
          <SimpleGrid columns={2} spacing={4}>
            <Field label="Store">{p.store_name}</Field>
            <Field label="Supplier">{p.supplier_name || p.supplier_id}</Field>
            <Field label="Vehicle">{p.vehicle_number}</Field>
            <Field label="Driver">{[p.driver_name, p.driver_phone].filter(Boolean).join(" · ")}</Field>
            <Field label="In at">{timeText(p.entry_time)}</Field>
            <Field label="Out at">{p.exit_time ? timeText(p.exit_time) : "Still open"}</Field>
            <Field label="Created by">{p.created_by}</Field>
          </SimpleGrid>
          <DocumentList docs={p.documents || []} error={p.documents_error} />
          <Box>
            <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
              Inspection
            </Text>
            {!p.inspections.length ? (
              <Text fontSize="sm" color="gray.600">
                Not inspected{(p.documents || []).length ? " — going direct to purchase." : " yet."}
              </Text>
            ) : (
              <Flex direction="column" gap={3}>
                {p.inspections.map((i) => (
                  <InspectionCard key={i.slug} i={i} />
                ))}
              </Flex>
            )}
            {p.inspection_totals_error ? (
              <Text fontSize="xs" color="orange.600" mt={2}>
                Line totals could not be read from RetailPilot: {p.inspection_totals_error}
              </Text>
            ) : null}
          </Box>
        </Flex>
      )}
    </DetailState>
  );
}

/** One inspection that has no open gate pass to show it through. */
function InspectionDetail({ slug }) {
  const state = useDetail(WarehouseFlowHelper.getInspection, slug);
  return (
    <DetailState state={state}>
      {(i) => (
        <Flex direction="column" gap={5} py={2}>
          <SimpleGrid columns={2} spacing={4}>
            <Field label="Store">{i.store_name}</Field>
            <Field label="Supplier">{i.supplier_name || i.supplier_id}</Field>
            <Field label="Gate pass">{i.gate_pass ? `${i.gate_pass}${i.gate_status ? ` (${i.gate_status.toLowerCase()})` : ""}` : "None"}</Field>
            <Field label="Vehicle">{i.vehicle_number}</Field>
            {i.gate_pass ? <Field label="In at">{timeText(i.entry_time)}</Field> : null}
            {i.gate_pass ? <Field label="Out at">{i.exit_time ? timeText(i.exit_time) : "Still open"}</Field> : null}
          </SimpleGrid>
          <InspectionCard i={i} />
          {i.inspection_totals_error ? (
            <Text fontSize="xs" color="orange.600">
              Line totals could not be read from RetailPilot: {i.inspection_totals_error}
            </Text>
          ) : null}
        </Flex>
      )}
    </DetailState>
  );
}

/** A step's list; a row opens that consignment. Stacked, so it reads on a phone. */
function StepList({ section, rows, storeName, onOpen }) {
  if (!section.ok) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription fontSize="sm">Could not be read from RetailPilot: {section.error}</AlertDescription>
      </Alert>
    );
  }
  if (!rows.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        Nothing here right now.
      </Text>
    );
  }
  return (
    <Box>
      <Text fontSize="xs" color="gray.600" mb={2}>
        {section.hint}. Oldest first; tap one for its detail.
      </Text>
      <Flex direction="column" borderTopWidth="1px" borderColor="gray.100">
        {rows.map((r) => {
          const status = rowStatus(section.key, r);
          const late = (r.hours || 0) >= 24;
          return (
            <Box
              key={`${r.kind}:${r.ref}`}
              onClick={() => onOpen(r)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(r)}
              tabIndex={0}
              role="button"
              aria-label={`Open ${r.kind === "document" ? `invoice ${r.invoice_no || r.ref}` : r.gate_pass || r.ref}`}
              cursor="pointer"
              px={2}
              py={3}
              borderBottomWidth="1px"
              borderColor="gray.100"
              _hover={{ bg: "purple.50" }}
            >
              <Flex justify="space-between" align="flex-start" gap={3}>
                <Box minW={0}>
                  <Text color="gray.900" fontWeight="700" fontSize="md" noOfLines={2} textTransform="capitalize">
                    {r.supplier_name || r.supplier_id || "Unknown supplier"}
                  </Text>
                  {r.kind === "allocation" ? (
                    <>
                      <Text fontSize="sm" color="gray.700" fontWeight="600" wordBreak="break-all">
                        Invoice {r.invoice_no || "—"}
                        {r.invoice_amount !== null && r.invoice_amount !== undefined ? ` · ${compactINR(Math.round(r.invoice_amount))}` : ""}
                      </Text>
                      {r.retries ? (
                        <Text fontSize="xs" color="orange.600">
                          {r.retries} allocation retr{r.retries === 1 ? "y" : "ies"} · last tried {timeText(r.last_attempt)}
                        </Text>
                      ) : null}
                    </>
                  ) : r.kind === "document" ? (
                    <Text fontSize="sm" color="gray.700" fontWeight="600" wordBreak="break-all">
                      Invoice {r.invoice_no || "(number not read yet)"}
                    </Text>
                  ) : invoiceLine(r, compactINR) ? (
                    <Text fontSize="sm" color="gray.700" fontWeight="600">
                      {invoiceLine(r, compactINR)}
                    </Text>
                  ) : null}
                  <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                    {r.kind === "allocation" ? `GRN ${r.ref}` : r.kind === "document" ? r.gate_pass || "No gate pass" : refText(r)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {[storeName(r.store), r.vehicle_number].filter(Boolean).join(" · ")}
                  </Text>
                </Box>
                <Flex direction="column" align="flex-end" gap={1} flexShrink={0}>
                  <Text fontSize="sm" fontWeight={late ? "700" : "400"} whiteSpace="nowrap">
                    {ageText(r.hours)}
                  </Text>
                  <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">
                    {sinceLabel(section.key)} {timeText(r.since)}
                  </Text>
                  {late ? (
                    <Badge colorScheme="orange" fontSize="9px">
                      over 24h
                    </Badge>
                  ) : null}
                  <Badge colorScheme={STATUS_COLOR[status] || "blue"} fontSize="9px">
                    {status}
                  </Badge>
                  {r.kind === "document" && r.grn_started ? (
                    <Badge colorScheme="purple" fontSize="9px">
                      {docStateText(r.doc_state)}
                    </Badge>
                  ) : null}
                </Flex>
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

/**
 * The side panel a step opens in: its list, and - after a row is clicked -
 * that consignment in full, with Back to the list.
 */
function StepPanel({ section, rows, storeName, open, onOpen, onBack, onClose, grnFilter, onGrnFilter }) {
  const isGrn = Boolean(section && SPLIT_LABELS[section.key]);
  const filters = !isGrn ? [] : section.key === "grn" ? grnFilters(rows) : splitFilters(section.key);
  const filter = isGrn ? filters.find((f) => f.key === grnFilter) || filters.find((f) => f.key === "all") : null;
  const shown = filter ? rows.filter(filter.test) : rows;
  const label = section
    ? isGrn && filter.key !== "all"
      ? section.key === "grn"
        ? `GRN · ${filter.label}`
        : filter.label
      : section.label
    : "";
  const title = open ? open.supplier_name || open.supplier_id || "Unknown supplier" : section ? `${label} · ${shown.length}` : "";
  return (
    <Drawer isOpen={Boolean(section)} placement="right" onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" pr={12}>
          {open ? (
            <Button size="xs" variant="ghost" colorScheme="purple" px={1} mb={1} onClick={onBack}>
              ← {section ? section.label : ""} list
            </Button>
          ) : null}
          <Text fontSize="xs" color="gray.500" fontWeight="600">
            {open
              ? open.kind === "allocation"
                ? "ALLOCATION"
                : open.gate_pass
                ? "GATE PASS"
                : open.kind === "document"
                ? "INVOICE"
                : "INSPECTION"
              : section && section.step
              ? `STEP ${section.step}`
              : "NEEDS ATTENTION"}
          </Text>
          <Text fontSize="md" textTransform={open ? "capitalize" : undefined}>
            {title}
          </Text>
          {open ? (
            <Text fontSize="xs" color="gray.500" fontWeight="400">
              {open.kind === "allocation" ? `Invoice ${open.invoice_no || "—"} · GRN ${open.ref}` : open.kind === "document" ? [`Invoice ${open.invoice_no || "(number not read yet)"}`, open.gate_pass].filter(Boolean).join(" · ") : refText(open)}
            </Text>
          ) : null}
        </DrawerHeader>
        <DrawerBody>
          {!section ? null : open ? (
            open.kind === "allocation" ? (
              <AllocationDetail a={open} storeName={storeName} />
            ) : open.gate_pass ? (
              <GatePassDetail slug={open.gate_pass} />
            ) : open.kind === "document" ? (
              <DocumentDetail row={open} />
            ) : (
              <InspectionDetail slug={open.inspection || open.ref} />
            )
          ) : (
            <>
              {isGrn ? (
                <Flex gap={2} mb={3} wrap="wrap">
                  {filters.map((f) => (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={f.key === filter.key ? "solid" : "outline"}
                      colorScheme="purple"
                      onClick={() => onGrnFilter(f.key)}
                    >
                      {f.label} ({rows.filter(f.test).length})
                    </Button>
                  ))}
                </Flex>
              ) : null}
              <StepList section={section} rows={shown} storeName={storeName} onOpen={onOpen} />
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * INVOICE PIPELINE (was "warehouse flow"), on the Business Dashboard: Gate pass -> Inspection -> GRN ->
 * Allocation -> Ready to dispatch. Each built step is a tile with what is in
 * it now; clicking one opens its list at the side, and a row there opens that
 * consignment. Nothing is listed until a tile is clicked. Follows the page's
 * store choice; `refreshTick` changing re-reads RetailPilot.
 */
export default function WarehouseFlowSection({ store: storeProp = "", refreshTick = 0, standalone = false }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  // On its own page the section has its own Store filter and Refresh; on the
  // Business Dashboard it follows the page's.
  const [ownStore, setOwnStore] = useState("");
  const store = standalone ? ownStore : storeProp;
  const [selected, setSelected] = useState(null);
  const [grnFilter, setGrnFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback((refresh) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    WarehouseFlowHelper.getFlow(refresh ? { refresh: 1 } : {})
      .then((res) => {
        setNow(Date.now());
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load the invoice pipeline", data: null });
      })
      .catch((err) => setState({ loading: false, error: err.message || "Could not load the invoice pipeline", data: null }));
  }, []);

  useEffect(() => {
    load(refreshTick > 0);
  }, [load, refreshTick]);

  const stages = (state.data && state.data.stages) || [];
  const attention = (state.data && state.data.attention) || [];
  const stores = (state.data && state.data.stores) || [];
  const storeName = (key) => (stores.find((s) => s.key === key) || {}).name || key;

  const sections = useMemo(
    () => [...stages.map((s, i) => ({ ...s, step: i + 1 })), ...attention.map((s) => ({ ...s, step: null }))],
    [stages, attention]
  );
  const rowsByKey = useMemo(() => {
    const out = {};
    sections.forEach((s) => {
      out[s.key] = stepRows(s, store, now);
    });
    return out;
  }, [sections, store, now]);

  const active = sections.find((s) => s.key === selected) || null;
  const choose = (key, filter) => {
    setOpen(null);
    setGrnFilter(filter || "all");
    setSelected(key);
  };
  const close = () => {
    setSelected(null);
    setOpen(null);
  };
  const flagged = attention.filter((a) => a.ok && (rowsByKey[a.key] || []).length);

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Flex align="baseline" justify="space-between" mb={3} wrap="wrap" gap={2}>
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          Invoice pipeline
        </Text>
        <Text fontSize="xs" color="gray.500">
          Now, live from RetailPilot{state.loading ? " · loading…" : ""}
        </Text>
      </Flex>
      {standalone ? (
        <Flex gap={3} mb={3} wrap="wrap" align="center">
          <Select size="sm" maxW="220px" value={ownStore} onChange={(e) => setOwnStore(e.target.value)} aria-label="Store">
            {stores.length !== 1 ? <option value="">All stores</option> : null}
            {stores.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button size="sm" colorScheme="purple" variant="outline" onClick={() => load(true)} isLoading={state.loading}>
            Refresh
          </Button>
        </Flex>
      ) : null}

      {state.error ? (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!state.data && state.loading ? (
        <Flex minH="120px" align="center" justify="center">
          <Spinner color="purple.500" />
        </Flex>
      ) : null}

      {stages.length ? (
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
          {stages.map((step, i) => (
            <StepTile
              key={step.key}
              index={i}
              step={step}
              summary={stepSummary(rowsByKey[step.key])}
              rows={rowsByKey[step.key]}
              onSelect={(filter) => choose(step.key, filter)}
            />
          ))}
        </SimpleGrid>
      ) : null}

      {flagged.length ? (
        <Flex mt={3} gap={4} wrap="wrap" align="center">
          {flagged.map((a) => (
            <Button key={a.key} size="xs" variant="link" colorScheme={a.key === "written_off" ? "red" : "orange"} onClick={() => choose(a.key)} title={a.hint}>
              {a.label}: {rowsByKey[a.key].length}
            </Button>
          ))}
        </Flex>
      ) : null}

      <StepPanel
        section={active}
        rows={active ? rowsByKey[active.key] || [] : []}
        storeName={storeName}
        open={open}
        onOpen={setOpen}
        onBack={() => setOpen(null)}
        onClose={close}
        grnFilter={grnFilter}
        onGrnFilter={setGrnFilter}
      />
    </Box>
  );
}
