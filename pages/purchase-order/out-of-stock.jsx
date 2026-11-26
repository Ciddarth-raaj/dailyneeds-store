import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import usePermissions from "../../customHooks/usePermissions";
import OosFollowupHelper from "../../helper/oosFollowup";
import { importFileToJSON } from "../../util/fileImport";

/**
 * Out-of-stock follow-up: the morning RetailPilot out-of-stock report,
 * routed to buyers. The chaser (chase_oos) sees every buyer and a
 * scoreboard; a buyer sees their own suppliers' lines and answers them.
 */

const HEADER_KEYS = {
  "Article ID": "article_id",
  Category: "category",
  Article: "article_name",
  Class: "class",
  Store: "store",
  MRP: "mrp",
  "Cover now": "cover_now",
  Planned: "planned",
  "%": "pct",
  Stock: "stock",
  Value: "value",
};

// Extensions AND file types: Android's picker filters on the type and greys
// out a .csv it cannot match to ".csv" alone (it calls it
// text/comma-separated-values). The file name is checked again on upload.
const FILE_ACCEPT = [
  ".csv",
  ".xlsx",
  ".xls",
  "text/csv",
  "text/comma-separated-values",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

const CAUSES = {
  warehouse_stock: { label: "Warehouse has stock", color: "teal" },
  po_pending: { label: "PO pending", color: "orange" },
  no_po: { label: "No PO", color: "red" },
  no_supplier: { label: "No supplier", color: "gray" },
};

const REASONS = {
  ordered: "Ordered",
  supplier_no_stock: "Supplier has no stock",
  transfer_raised: "Transfer raised",
  price_issue: "Price issue",
  discontinued: "Discontinued (hide)",
  ignore: "Ignore (hide)",
  other: "Other",
};

const LISTS = [
  { key: "chase", label: "To chase", short: "Chase" },
  { key: "waiting", label: "Waiting (C, under 5 days)", short: "Waiting" },
  { key: "review", label: "Slow-moving review (X)", short: "Slow (X)" },
  { key: "all", label: "All open", short: "All" },
];
const MOBILE_PAGE = 30;

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const title = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const CLASS_ORDER = { A: 0, B: 1, C: 2, X: 3 };

/**
 * Lines (one per store) -> items: one per article, with its stores, total
 * value, longest days out, and the causes and answers of its stores.
 * Ordered by tier, class, then total value.
 */
function groupItems(lines) {
  const byArticle = new Map();
  for (const l of lines) {
    if (!byArticle.has(l.article_id)) byArticle.set(l.article_id, []);
    byArticle.get(l.article_id).push(l);
  }
  const items = [...byArticle.values()].map((ls) => {
    const first = ls[0];
    const causes = [];
    for (const l of ls) {
      if (!causes.some((c) => c.cause === l.cause && c.detail === l.cause_detail)) causes.push({ cause: l.cause, detail: l.cause_detail });
    }
    const reasons = [...new Set(ls.map((l) => l.reason || ""))];
    const noted = ls.filter((l) => l.last_note).sort((a, b) => String(b.last_note_at).localeCompare(String(a.last_note_at)))[0];
    const cls = ls.map((l) => l.class).sort((a, b) => (CLASS_ORDER[a] ?? 9) - (CLASS_ORDER[b] ?? 9))[0];
    return {
      key: String(first.article_id),
      article_id: first.article_id,
      article_name: first.article_name,
      category: first.category,
      class: cls,
      supplier_name: first.supplier_name,
      buyer_name: first.buyer_name,
      lines: ls,
      ids: ls.map((l) => l.id),
      stores_text: ls.map((l) => title(l.store)).join(", "),
      value: ls.reduce((t, l) => t + (Number(l.value) || 0), 0),
      days_out: Math.max(...ls.map((l) => l.days_out || 0)),
      tier: Math.min(...ls.map((l) => l.tier || 9)),
      is_new: ls.every((l) => l.is_new),
      causes,
      cause: causes.length === 1 ? causes[0].cause : "",
      reason: reasons.length === 1 ? reasons[0] || null : null,
      mixed_reasons: reasons.length > 1,
      last_note: noted ? noted.last_note : null,
      needs_update: ls.some((l) => l.needs_update),
    };
  });
  items.sort((a, b) => a.tier - b.tier || (CLASS_ORDER[a.class] ?? 9) - (CLASS_ORDER[b.class] ?? 9) || b.value - a.value);
  return items;
}

function CauseLine({ c, size = "xs" }) {
  const k = CAUSES[c.cause] || { label: c.cause, color: "gray" };
  return (
    <Box>
      <Badge colorScheme={k.color}>{k.label}</Badge>{" "}
      <Text as="span" fontSize={size}>
        {c.detail}
      </Text>
    </Box>
  );
}

function AnswerLine({ item }) {
  if (item.reason || item.last_note || item.mixed_reasons) {
    return (
      <Text fontSize="xs">
        {item.reason ? <b>{REASONS[item.reason] || item.reason}</b> : item.mixed_reasons ? <b>Answers differ by store</b> : null}
        {item.last_note ? ` "${item.last_note}"` : ""}
      </Text>
    );
  }
  return item.needs_update ? <Badge colorScheme="red">No update</Badge> : null;
}

function UpdateModal({ item, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!item) return;
    setReason(item.reason || "");
    setNote("");
    setEvents(null);
    if (item.kind === "supplier") {
      setEvents([]); // a supplier's history is on each of its items
      return;
    }
    const storeOf = new Map(item.lines.map((l) => [l.id, title(l.store)]));
    Promise.all(item.ids.map((id) => OosFollowupHelper.events(id).then((b) => (b.data || []).map((e) => ({ ...e, store: storeOf.get(id) })))))
      .then((lists) => {
        // One answer saved for several stores shows once, with its stores.
        const merged = new Map();
        for (const e of lists.flat()) {
          const k = `${moment(e.created_at).format("YYYY-MM-DD HH:mm")}|${e.employee_id}|${e.reason || ""}|${e.note || ""}`;
          if (merged.has(k)) merged.get(k).stores.push(e.store);
          else merged.set(k, { ...e, stores: [e.store] });
        }
        setEvents([...merged.values()].sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))));
      })
      .catch(() => setEvents([]));
  }, [item]);

  const save = async () => {
    const changedReason = reason && (reason !== item.reason || item.mixed_reasons) ? reason : null;
    if (!changedReason && !note.trim()) {
      toast.error("Choose a reason or write a note");
      return;
    }
    setSaving(true);
    try {
      await OosFollowupHelper.answerMany(item.ids, { reason: changedReason, note: note.trim() || null });
      toast.success(item.ids.length > 1 ? `Saved for ${item.ids.length} stores` : "Saved");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const many = item && item.ids.length > 1;
  const isSupplier = item && item.kind === "supplier";
  return (
    <Modal isOpen={Boolean(item)} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {item ? title(isSupplier ? item.supplier_name : item.article_name) : ""}
          <Text fontSize="sm" fontWeight="normal" color="gray.600">
            {item
              ? isSupplier
                ? `${item.items.length} item(s) · ${item.ids.length} store line(s) · ${rupees(item.value)}`
                : `${item.supplier_name || "no supplier"} · out up to ${item.days_out} day(s)`
              : ""}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {item ? (
            <VStack align="stretch" spacing={3}>
              {isSupplier ? (
                <Box maxH="160px" overflowY="auto">
                  <Text fontSize="sm" fontWeight="semibold">
                    Every item below gets this answer
                  </Text>
                  {item.items.map((it) => (
                    <Text key={it.key} fontSize="xs">
                      {title(it.article_name)} · {it.stores_text}
                    </Text>
                  ))}
                </Box>
              ) : (
                <>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">
                      Out in {item.lines.length} {item.lines.length === 1 ? "store" : "stores"}
                    </Text>
                    {item.lines.map((l) => (
                      <Text key={l.id} fontSize="xs">
                        {title(l.store)} · {l.days_out} day(s) · {rupees(l.value)}
                        {l.reason ? ` · ${REASONS[l.reason] || l.reason}` : ""}
                      </Text>
                    ))}
                  </Box>
                  {item.causes.map((c) => (
                    <CauseLine key={`${c.cause}|${c.detail}`} c={c} size="sm" />
                  ))}
                </>
              )}
              <Select size="sm" placeholder="Reason…" value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Textarea size="sm" placeholder="Note (optional) – e.g. supplier delivers Friday" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
              {many && !isSupplier ? (
                <Text fontSize="xs" color="gray.600">
                  Saved for all {item.ids.length} stores above.
                </Text>
              ) : null}
              {isSupplier ? (
                <Text fontSize="xs" color="gray.600">
                  Each item's history is under its own Update button.
                </Text>
              ) : (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  History
                </Text>
                {events == null ? (
                  <Spinner size="sm" />
                ) : events.length ? (
                  <VStack align="stretch" spacing={1}>
                    {events.map((e) => (
                      <Text key={`${e.oos_case_event_id}`} fontSize="xs">
                        <b>{moment(e.created_at).format("DD-MM HH:mm")}</b> · {e.employee_name || "?"}
                        {many ? ` · ${e.stores.join(", ")}` : ""}
                        {e.reason ? ` · ${REASONS[e.reason] || e.reason}` : ""}
                        {e.note ? ` · "${e.note}"` : ""}
                      </Text>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="xs" color="gray.500">
                    Nothing yet
                  </Text>
                )}
              </Box>
              )}
            </VStack>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button size="sm" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={save} isLoading={saving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** One item (all its stores) as a card, for phones. */
function ItemCard({ item, showBuyer, showSupplier = true, onUpdate }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={3} bg="white">
      <Flex justify="space-between" align="flex-start" gap={2}>
        <Box minW={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {title(item.article_name)}{" "}
            {item.is_new ? (
              <Badge colorScheme="purple" fontSize="0.6em">
                NEW
              </Badge>
            ) : null}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Class {item.class || "-"} · {rupees(item.value)} · up to {item.days_out} day(s) out
          </Text>
        </Box>
        <Button size="xs" colorScheme="purple" variant="outline" flexShrink={0} onClick={() => onUpdate(item)}>
          Update
        </Button>
      </Flex>
      <Text fontSize="xs" mt={1}>
        <b>Out in:</b> {item.stores_text}
      </Text>
      {showSupplier ? (
        <Text fontSize="xs">
          {item.supplier_name || "No supplier"}
          {showBuyer ? ` · ${item.buyer_name || "No buyer"}` : ""}
        </Text>
      ) : null}
      <VStack align="stretch" spacing={0.5} mt={1}>
        {item.causes.map((c) => (
          <CauseLine key={`${c.cause}|${c.detail}`} c={c} />
        ))}
      </VStack>
      <Box mt={1}>
        <AnswerLine item={item} />
      </Box>
    </Box>
  );
}

/**
 * Items -> suppliers: one per supplier, with its items, every store line
 * (for "Update all"), total value, class A items and items with no update.
 * Ordered by tier, class A count, then value.
 */
function groupSuppliers(items) {
  const bySupplier = new Map();
  for (const it of items) {
    const key = it.supplier_name || "";
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key).push(it);
  }
  const groups = [...bySupplier.entries()].map(([key, its]) => {
    const lines = its.flatMap((i) => i.lines);
    const reasons = [...new Set(lines.map((l) => l.reason || ""))];
    return {
      key: key || "__none",
      kind: "supplier",
      supplier_name: key || "No supplier",
      buyer_name: its[0].buyer_name,
      items: its,
      lines,
      ids: lines.map((l) => l.id),
      value: its.reduce((t, i) => t + i.value, 0),
      class_a: its.filter((i) => i.class === "A").length,
      no_update: its.filter((i) => i.needs_update).length,
      new_items: its.filter((i) => i.is_new).length,
      tier: Math.min(...its.map((i) => i.tier)),
      days_out: Math.max(...its.map((i) => i.days_out)),
      reason: reasons.length === 1 ? reasons[0] || null : null,
      mixed_reasons: reasons.length > 1,
    };
  });
  groups.sort((a, b) => (a.key === "__none") - (b.key === "__none") || a.tier - b.tier || b.class_a - a.class_a || b.value - a.value);
  return groups;
}

function SupplierSection({ group, open, onToggle, showBuyer, onUpdate }) {
  return (
    <Box borderWidth="1px" borderRadius="md" bg="white" overflow="hidden">
      <Flex
        p={3}
        gap={2}
        align="flex-start"
        justify="space-between"
        cursor="pointer"
        bg={open ? "purple.50" : undefined}
        onClick={onToggle}
      >
        <Box minW={0}>
          <Text fontWeight="bold" fontSize="sm">
            {open ? "▾" : "▸"} {title(group.supplier_name)}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {group.items.length} item{group.items.length === 1 ? "" : "s"} · {rupees(group.value)}
            {group.class_a ? ` · ${group.class_a} class A` : ""}
            {group.new_items ? ` · ${group.new_items} new` : ""}
            {showBuyer ? ` · ${group.buyer_name || "No buyer"}` : ""}
          </Text>
          {group.no_update ? (
            <Badge colorScheme="red" mt={1}>
              {group.no_update} no update
            </Badge>
          ) : group.reason ? (
            <Text fontSize="xs" mt={1}>
              <b>{REASONS[group.reason] || group.reason}</b>
            </Text>
          ) : null}
        </Box>
        <Button
          size="xs"
          colorScheme="purple"
          flexShrink={0}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(group);
          }}
        >
          Update all
        </Button>
      </Flex>
      {open ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={2} p={2} pt={0}>
          {group.items.map((it) => (
            <ItemCard key={it.key} item={it} showBuyer={false} showSupplier={false} onUpdate={onUpdate} />
          ))}
        </SimpleGrid>
      ) : null}
    </Box>
  );
}

function Scoreboard({ rows, selected, onSelect, compact = false }) {
  const full = !compact;
  if (!rows || !rows.length) return null;
  return (
    <Box borderWidth="1px" borderRadius="md" overflowX="auto" mb={4} bg="white">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Buyer</Th>
            <Th isNumeric>To chase</Th>
            {full ? <Th isNumeric>Class A</Th> : null}
            {full ? <Th isNumeric>Value to chase</Th> : null}
            <Th isNumeric>No update</Th>
            {compact ? <Th isNumeric>Value</Th> : null}
            {full ? <Th isNumeric>New today</Th> : null}
            {full ? <Th isNumeric>Oldest (days)</Th> : null}
            {full ? <Th isNumeric>Back in stock</Th> : null}
            {full ? <Th isNumeric>Slow-moving</Th> : null}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r) => {
            const key = r.buyer_id == null ? "none" : String(r.buyer_id);
            return (
              <Tr
                key={key}
                cursor="pointer"
                bg={selected === key ? "purple.50" : undefined}
                _hover={{ bg: "gray.50" }}
                onClick={() => onSelect(selected === key ? "" : key)}
              >
                <Td fontWeight="semibold">{r.buyer_name}</Td>
                <Td isNumeric>{r.to_chase}</Td>
                {full ? <Td isNumeric>{r.class_a}</Td> : null}
                {full ? <Td isNumeric>{rupees(r.value_to_chase)}</Td> : null}
                <Td isNumeric color={r.not_updated ? "red.600" : undefined} fontWeight={r.not_updated ? "bold" : undefined}>
                  {r.not_updated}
                </Td>
                {compact ? <Td isNumeric>{rupees(r.value_to_chase)}</Td> : null}
                {full ? <Td isNumeric>{r.new_today}</Td> : null}
                {full ? <Td isNumeric>{r.oldest_days}</Td> : null}
                {full ? (
                  <Td isNumeric color="green.600">
                    {r.back_in_stock}
                  </Td>
                ) : null}
                {full ? <Td isNumeric>{r.review}</Td> : null}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default function OutOfStockFollowupPage() {
  const canChase = usePermissions(["chase_oos"]);
  const canUpload = usePermissions(["upload_oos_report"]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [list, setList] = useState(0);
  const [store, setStore] = useState("");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [shownCount, setShownCount] = useState(MOBILE_PAGE);
  const [openSuppliers, setOpenSuppliers] = useState(() => new Set());
  const [allOpen, setAllOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (buyer) params.buyer_id = buyer;
      if (showHidden) params.hidden = 1;
      const body = await OosFollowupHelper.view(params);
      setData(body.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [buyer, showHidden]);

  useEffect(() => {
    load();
  }, [load]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast.error("Choose the out-of-stock report (.csv or Excel)");
      return;
    }
    setUploading(true);
    try {
      const parsed = await importFileToJSON(file, ["Article ID", "Store"], 1);
      const rows = parsed.data.map((r) => {
        const out = {};
        for (const [header, key] of Object.entries(HEADER_KEYS)) out[key] = r[header] ?? "";
        return out;
      });
      const res = await OosFollowupHelper.upload({ rows, file_name: file.name });
      toast.success(
        `Report ${moment(res.report_date).format("DD-MM-YYYY")}: ${res.lines} lines · ${res.opened} new · ${res.back_in_stock} back in stock`,
        { duration: 8000 }
      );
      (res.warnings || []).forEach((w) => toast(w, { duration: 10000, icon: "⚠️" }));
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const cases = data?.cases || [];
  const stores = useMemo(() => [...new Set(cases.map((c) => c.store))].sort(), [cases]);
  const listKey = LISTS[list].key;
  // Tab counts are items (an item out in 3 stores counts once).
  const counts = useMemo(() => {
    const sets = { chase: new Set(), waiting: new Set(), review: new Set(), all: new Set() };
    for (const x of cases) {
      sets[x.list].add(x.article_id);
      sets.all.add(x.article_id);
    }
    return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.size]));
  }, [cases]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter(
      (c) =>
        (listKey === "all" || c.list === listKey) &&
        (!store || c.store === store) &&
        (!cause || c.cause === cause) &&
        (!q || `${c.article_name} ${c.article_id} ${c.supplier_name || ""} ${c.category || ""}`.toLowerCase().includes(q))
    );
  }, [cases, listKey, store, cause, search]);

  const suppliers = useMemo(() => groupSuppliers(groupItems(shown)), [shown]);

  useEffect(() => {
    setShownCount(MOBILE_PAGE);
    setOpenSuppliers(new Set());
  }, [list, store, cause, search, buyer, showHidden]);
  const isOpen = (key) => allOpen || openSuppliers.has(key) || suppliers.length === 1;
  const toggle = (key) =>
    setOpenSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const upload = data?.upload;
  return (
    <GlobalWrapper title="Out of Stock Follow-up" permissionKey={["view_my_oos", "chase_oos", "upload_oos_report"]}>
      <CustomContainer
        title={canChase ? "Out of Stock Follow-up" : "My Out of Stock"}
        filledHeader
        rightSection={
          <Flex gap={2}>
            <Button size="sm" variant="outline" colorScheme="purple" onClick={load} isLoading={loading}>
              Refresh
            </Button>
            {canUpload ? (
              <>
                <input ref={fileRef} type="file" accept={FILE_ACCEPT} style={{ display: "none" }} onChange={onFile} />
                <Button size="sm" colorScheme="purple" onClick={() => fileRef.current && fileRef.current.click()} isLoading={uploading}>
                  Upload today's report
                </Button>
              </>
            ) : null}
          </Flex>
        }
      >
        <Text fontSize="sm" color="gray.600" mb={3}>
          {upload
            ? `Report of ${moment(upload.report_date).format("DD-MM-YYYY")} · uploaded ${moment(upload.uploaded_at).format("DD-MM-YYYY hh:mm A")}${
                upload.uploaded_by ? ` by ${upload.uploaded_by}` : ""
              }`
            : loading
            ? "Loading…"
            : "No report uploaded yet."}
        </Text>
        {upload && upload.warnings && upload.warnings.length ? (
          <Box bg="orange.50" borderRadius="md" p={2} mb={3}>
            {upload.warnings.map((w) => (
              <Text key={w} fontSize="xs" color="orange.800">
                ⚠ {w}
              </Text>
            ))}
          </Box>
        ) : null}

        {canChase ? <Scoreboard rows={data?.scoreboard} selected={buyer} onSelect={setBuyer} compact={isMobile} /> : null}

        <SimpleGrid columns={{ base: 1, md: canChase ? 5 : 4 }} spacing={2} mb={3}>
          {canChase ? (
            <Select size="sm" value={buyer} onChange={(e) => setBuyer(e.target.value)}>
              <option value="">All buyers</option>
              {(data?.scoreboard || []).map((r) => (
                <option key={r.buyer_id == null ? "none" : r.buyer_id} value={r.buyer_id == null ? "none" : String(r.buyer_id)}>
                  {r.buyer_name}
                </option>
              ))}
            </Select>
          ) : null}
          <Select size="sm" value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s} value={s}>
                {title(s)}
              </option>
            ))}
          </Select>
          <Select size="sm" value={cause} onChange={(e) => setCause(e.target.value)}>
            <option value="">All causes</option>
            {Object.entries(CAUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Input size="sm" placeholder="Search item, supplier, category" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Checkbox size="sm" isChecked={showHidden} onChange={(e) => setShowHidden(e.target.checked)}>
            Show discontinued / ignored
          </Checkbox>
        </SimpleGrid>

        <Tabs size="sm" colorScheme="purple" index={list} onChange={setList} mb={2}>
          <TabList overflowX="auto" overflowY="hidden">
            {LISTS.map((l) => (
              <Tab key={l.key} whiteSpace="nowrap" px={isMobile ? 2 : 4}>
                {isMobile ? l.short : l.label} ({counts[l.key] || 0})
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Flex justify="space-between" align="center" mb={2} gap={2} wrap="wrap">
          <Text fontSize="xs" color="gray.600">
            {suppliers.length} supplier(s) · {counts[listKey] != null && listKey !== "all" ? `${counts[listKey]} item(s)` : `${counts.all} item(s)`}
          </Text>
          <Button size="xs" variant="ghost" colorScheme="purple" onClick={() => setAllOpen((v) => !v)}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </Flex>
        <VStack align="stretch" spacing={2}>
          {loading && !suppliers.length ? <Spinner /> : null}
          {!loading && !suppliers.length ? (
            <Text fontSize="sm" color="gray.500">
              Nothing here.
            </Text>
          ) : null}
          {suppliers.slice(0, shownCount).map((g) => (
            <SupplierSection
              key={g.key}
              group={g}
              open={isOpen(g.key)}
              onToggle={() => toggle(g.key)}
              showBuyer={canChase}
              onUpdate={setEditing}
            />
          ))}
          {suppliers.length > shownCount ? (
            <Button size="sm" variant="outline" onClick={() => setShownCount((n) => n + MOBILE_PAGE)}>
              Show more suppliers ({suppliers.length - shownCount} left)
            </Button>
          ) : null}
        </VStack>
      </CustomContainer>
      <UpdateModal
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </GlobalWrapper>
  );
}
