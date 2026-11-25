import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import TransfersHelper from "../../helper/transfers";
import { TYPES, VIEWS, filterTransfers, mixText, statusText, summarize, viewRange } from "../../util/transfers";
import { ageText } from "../../util/warehouseFlow";
import { compactINR, formatINR } from "../../util/payrollDashboard";

const timeText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const STATUS_COLOR = { IN_TRANSIT: "purple", PARTIALLY_RECEIVED: "blue", RECEIVED: "green" };

function Tile({ label, value, sub, accent = "gray.300" }) {
  return (
    <Box px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200" borderLeftWidth="4px" borderLeftColor={accent} borderRadius="md">
      <Text fontSize="xs" color="gray.600" fontWeight="600">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
        {value}
      </Text>
      {sub ? (
        <Text fontSize="xs" color="gray.600">
          {sub}
        </Text>
      ) : null}
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

/** One article: totals across its boxes; tap to see each box and batch. */
function ArticleRow({ a }) {
  const [open, setOpen] = useState(false);
  return (
    <Box borderBottomWidth="1px" borderColor="gray.100">
      <Box
        as="button"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        w="100%"
        textAlign="left"
        px={2}
        py={3}
        bg={a.short > 0 ? "orange.50" : undefined}
        _hover={{ bg: a.short > 0 ? "orange.100" : "gray.50" }}
      >
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="700" color="gray.900" noOfLines={2}>
              {a.name || `Article ${a.article_id}`}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {[a.code ? `Code ${a.code}` : null, `ID ${a.article_id}`, `${a.boxes.length} box line${a.boxes.length === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <Text fontSize="xs" color="gray.700" mt={1}>
              Sent <b>{qty(a.sent)}</b> · Received <b>{qty(a.received)}</b>
              {a.in_transit ? (
                <>
                  {" "}
                  · In transit <b>{qty(a.in_transit)}</b>
                </>
              ) : null}
            </Text>
          </Box>
          <Flex direction="column" align="flex-end" gap={1} flexShrink={0}>
            <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
              {formatINR(a.value)}
            </Text>
            {a.short > 0 ? (
              <Badge colorScheme="orange" fontSize="9px">
                {qty(a.short)} short
              </Badge>
            ) : null}
            <Text fontSize="10px" color="purple.600">
              {open ? "Hide boxes ▲" : "Boxes ▼"}
            </Text>
          </Flex>
        </Flex>
      </Box>
      <Collapse in={open} animateOpacity>
        <Box px={3} pb={3}>
          {a.boxes.map((b, i) => (
            <Flex key={`${b.box_id}:${b.batch_id}:${i}`} justify="space-between" gap={2} py={1} fontSize="xs" borderTopWidth={i ? "1px" : 0} borderColor="gray.100">
              <Box minW={0}>
                <Text color="gray.800" wordBreak="break-all">
                  Box {b.box_id || "—"}
                </Text>
                <Text color="gray.500" wordBreak="break-all">
                  Batch {b.batch_id || "—"}
                  {b.mrp !== null && b.mrp !== undefined ? ` · MRP ${formatINR(b.mrp)}` : ""}
                </Text>
              </Box>
              <Box textAlign="right" flexShrink={0}>
                <Text color="gray.800">Qty {qty(b.qty)}</Text>
                <Text color={b.returned_qty ? "orange.600" : "gray.500"}>
                  {b.returned_qty ? `${qty(b.returned_qty)} short · ` : ""}
                  {statusText(b.status)}
                </Text>
              </Box>
            </Flex>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

/** One transfer: header, store verification, and its articles. */
function TransferDetail({ slug }) {
  const [state, setState] = useState({ loading: true, error: null, t: null });
  useEffect(() => {
    if (!slug) return undefined;
    let live = true;
    setState({ loading: true, error: null, t: null });
    TransfersHelper.get(slug)
      .then((res) => {
        if (!live) return;
        if (res && res.code === 200) setState({ loading: false, error: null, t: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load the transfer", t: null });
      })
      .catch((err) => live && setState({ loading: false, error: err.message || "Could not load the transfer", t: null }));
    return () => {
      live = false;
    };
  }, [slug]);

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
  const t = state.t;
  if (!t) return null;
  return (
    <Flex direction="column" gap={5} py={2}>
      <Flex gap={2} wrap="wrap">
        <Badge colorScheme={STATUS_COLOR[t.status] || "gray"}>{statusText(t.status)}</Badge>
        <Badge colorScheme="gray">{t.job_type}</Badge>
        {t.short ? <Badge colorScheme="orange">{qty(t.short.returned_qty)} units short</Badge> : null}
      </Flex>
      <SimpleGrid columns={2} spacing={4}>
        <Field label="From">{t.origin_name}</Field>
        <Field label="To">{t.store_name}</Field>
        <Field label="Dispatched">{timeText(t.dispatched_at)}</Field>
        <Field label="Received">{t.received_at ? timeText(t.received_at) : "Not yet"}</Field>
        <Field label="Truck">{t.truck_id}</Field>
        <Field label="E-way bill">{t.eway_bill_no || "Not generated"}</Field>
        <Field label="Boxes">{qty(t.box_count)}</Field>
        <Field label="Articles">{qty(t.article_count)}</Field>
        <Field label="Units">{qty(t.total_qty)}</Field>
        <Field label="Value (landing cost)">{t.total_landing_cost === null ? null : formatINR(t.total_landing_cost)}</Field>
        <Field label="MRP value">{t.total_mrp_value === null ? null : formatINR(t.total_mrp_value)}</Field>
        <Field label="Carries">{mixText(t.documents_mix) || "—"}</Field>
      </SimpleGrid>

      <Box>
        <Text fontSize="sm" fontWeight="700" color="gray.700" mb={1}>
          Articles ({t.articles.length})
        </Text>
        <Text fontSize="xs" color="gray.500" mb={2}>
          Short ones first. Tap an article for its boxes and batches.
        </Text>
        {t.lines_error ? (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">Articles could not be read from RetailPilot: {t.lines_error}</AlertDescription>
          </Alert>
        ) : !t.articles.length ? (
          <Text fontSize="sm" color="gray.500">
            No article lines on this transfer.
          </Text>
        ) : (
          <Box borderTopWidth="1px" borderColor="gray.100">
            {t.articles.map((a) => (
              <ArticleRow key={a.article_id} a={a} />
            ))}
          </Box>
        )}
        {t.article_names_error ? (
          <Text fontSize="xs" color="orange.600" mt={2}>
            Article names could not be read: {t.article_names_error}
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
}

/**
 * TRANSFERS - stock dispatched to stores, live from RetailPilot. Opens on
 * the transfers still open (in transit or partly received); a view picks a
 * dispatch date range instead. Tap a transfer for its articles.
 */
export default function TransfersView() {
  const [view, setView] = useState("open");
  const [custom, setCustom] = useState(() => viewRange("today"));
  const [store, setStore] = useState("");
  const [type, setType] = useState("");
  const [openSlug, setOpenSlug] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [now, setNow] = useState(() => Date.now());

  const range = view === "custom" ? custom : viewRange(view);
  const params = range ? { from_date: range.from, to_date: range.to } : {};
  const paramsKey = JSON.stringify(params);

  const load = useCallback(
    (refresh) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      TransfersHelper.list({ ...JSON.parse(paramsKey), ...(refresh ? { refresh: 1 } : {}) })
        .then((res) => {
          setNow(Date.now());
          if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
          else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load transfers", data: null });
        })
        .catch((err) => setState({ loading: false, error: err.message || "Could not load transfers", data: null }));
    },
    [paramsKey]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const data = state.data;
  const stores = (data && data.stores) || [];
  const storeName = (key) => (stores.find((s) => s.key === key) || {}).name || key;
  const rows = useMemo(() => filterTransfers(data && data.transfers, { store, type }, now), [data, store, type, now]);
  const sum = summarize(rows);
  const open = rows.find((r) => r.slug === openSlug) || null;

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-end" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="lg" fontWeight="600" color="purple.700">
            Transfers
          </Text>
          <Text fontSize="xs" color="gray.500">
            Stock dispatched to stores · live from RetailPilot
            {data && data.fetched_at ? ` · fetched ${new Date(data.fetched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </Text>
        </Box>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Show
            </FormLabel>
            <Select size="sm" value={view} onChange={(e) => setView(e.target.value)} aria-label="Show">
              {VIEWS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </Select>
          </FormControl>
          {view === "custom" ? (
            <>
              <FormControl w="auto">
                <FormLabel fontSize="xs" color="gray.600" mb={1}>
                  From
                </FormLabel>
                <Input size="sm" type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} />
              </FormControl>
              <FormControl w="auto">
                <FormLabel fontSize="xs" color="gray.600" mb={1}>
                  To
                </FormLabel>
                <Input size="sm" type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} />
              </FormControl>
            </>
          ) : null}
          <FormControl w="auto" minW="160px">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              To store
            </FormLabel>
            <Select size="sm" value={store} onChange={(e) => setStore(e.target.value)} aria-label="To store">
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Type
            </FormLabel>
            <Select size="sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button size="sm" colorScheme="purple" variant="outline" onClick={() => load(true)} isLoading={state.loading}>
            Refresh
          </Button>
        </Flex>
      </Flex>

      {state.error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {data && data.shortfalls_error ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">Shortfalls could not be read from RetailPilot: {data.shortfalls_error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && state.loading ? (
        <Flex minH="240px" align="center" justify="center">
          <Spinner size="lg" color="purple.500" thickness="3px" />
        </Flex>
      ) : null}

      {data ? (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            <Tile label="In transit" value={sum.in_transit.count} sub={`${qty(sum.in_transit.boxes)} boxes · ${compactINR(sum.in_transit.value)}`} accent="purple.400" />
            <Tile label="Partly received" value={sum.partly.count} sub={compactINR(sum.partly.value)} accent="blue.400" />
            <Tile label="Received" value={sum.received.count} sub={data.open_only ? "Pick dates to see received ones" : compactINR(sum.received.value)} accent="green.400" />
            <Tile label="Short on receiving" value={sum.short.count} sub={sum.short.count ? `${qty(sum.short.units)} units · ${compactINR(sum.short.value)}` : "None"} accent="orange.400" />
          </SimpleGrid>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={{ base: 2, md: 4 }}>
            {!rows.length ? (
              <Text fontSize="sm" color="gray.500" p={2}>
                {data.open_only ? "No transfer is on the road right now." : "No transfers for these dates."}
              </Text>
            ) : (
              rows.map((t) => (
                <Box
                  key={t.slug}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open transfer to ${storeName(t.store)}`}
                  onClick={() => setOpenSlug(t.slug)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpenSlug(t.slug)}
                  cursor="pointer"
                  px={2}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  _hover={{ bg: "purple.50" }}
                >
                  <Flex justify="space-between" align="flex-start" gap={3}>
                    <Box minW={0}>
                      <Text fontWeight="700" fontSize="md" color="gray.900">
                        To {storeName(t.store)}
                      </Text>
                      <Text fontSize="sm" color="gray.700" fontWeight="600">
                        {`${qty(t.box_count)} box${t.box_count === 1 ? "" : "es"} · ${qty(t.article_count)} articles`}
                        {t.total_landing_cost !== null ? ` · ${compactINR(t.total_landing_cost)}` : ""}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {[mixText(t.documents_mix), `dispatched ${timeText(t.dispatched_at)}`].filter(Boolean).join(" · ")}
                      </Text>
                      <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                        Transfer {t.slug} · {t.job_type}
                        {t.truck_id ? ` · truck ${t.truck_id}` : ""}
                      </Text>
                    </Box>
                    <Flex direction="column" align="flex-end" gap={1} flexShrink={0}>
                      <Text fontSize="sm" whiteSpace="nowrap">
                        {ageText(t.hours)}
                      </Text>
                      <Badge colorScheme={STATUS_COLOR[t.status] || "gray"} fontSize="9px">
                        {statusText(t.status)}
                      </Badge>
                      {t.short ? (
                        <Badge colorScheme="orange" fontSize="9px">
                          {qty(t.short.returned_qty)} short
                        </Badge>
                      ) : null}
                    </Flex>
                  </Flex>
                </Box>
              ))
            )}
          </Box>
        </>
      ) : null}

      <Drawer isOpen={Boolean(openSlug)} placement="right" onClose={() => setOpenSlug(null)} size="lg">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" pr={12}>
            <Text fontSize="xs" color="gray.500" fontWeight="600">
              TRANSFER
            </Text>
            <Text fontSize="md">{open ? `To ${storeName(open.store)}` : ""}</Text>
            <Text fontSize="xs" color="gray.500" fontWeight="400">
              {openSlug}
            </Text>
          </DrawerHeader>
          <DrawerBody>{openSlug ? <TransferDetail slug={openSlug} /> : null}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
