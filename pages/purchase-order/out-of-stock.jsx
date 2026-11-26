import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
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
 * routed to buyers - a read-only list, grouped by supplier. The chaser
 * (chase_oos) sees every buyer and a scoreboard; a buyer sees their own
 * suppliers' lines.
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
 * Ordered by total value, highest first.
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
    };
  });
  items.sort((a, b) => b.value - a.value);
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


/** One item (all its stores) as a card. */
function ItemCard({ item, showBuyer, showSupplier = true }) {
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
    </Box>
  );
}

/**
 * Items -> suppliers: one per supplier, with its items, total value and
 * class A items (ordered by sortSuppliers).
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
      new_items: its.filter((i) => i.is_new).length,
      tier: Math.min(...its.map((i) => i.tier)),
      days_out: Math.max(...its.map((i) => i.days_out)),
    };
  });
  return groups;
}

// How the supplier sections are ordered; "No supplier" is always last.
const SUPPLIER_SORTS = {
  value: { label: "Value (highest first)", cmp: (a, b) => b.value - a.value },
  class_a: { label: "Class A items", cmp: (a, b) => b.class_a - a.class_a || b.value - a.value },
  items: { label: "Number of items", cmp: (a, b) => b.items.length - a.items.length || b.value - a.value },
  name: { label: "Supplier name A-Z", cmp: (a, b) => a.supplier_name.localeCompare(b.supplier_name) },
};

function sortSuppliers(groups, by) {
  const cmp = (SUPPLIER_SORTS[by] || SUPPLIER_SORTS.value).cmp;
  return [...groups].sort((a, b) => (a.key === "__none") - (b.key === "__none") || cmp(a, b));
}

function SupplierSection({ group, open, onToggle, showBuyer }) {
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
        </Box>
      </Flex>
      {open ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={2} p={2} pt={0}>
          {group.items.map((it) => (
            <ItemCard key={it.key} item={it} showBuyer={false} showSupplier={false} />
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
  const [list, setList] = useState(0);
  const [store, setStore] = useState("");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("value");
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
      const body = await OosFollowupHelper.view(params);
      setData(body.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [buyer]);

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

  const suppliers = useMemo(() => sortSuppliers(groupSuppliers(groupItems(shown)), sortBy), [shown, sortBy]);

  useEffect(() => {
    setShownCount(MOBILE_PAGE);
    setOpenSuppliers(new Set());
  }, [list, store, cause, search, buyer]);
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
          <Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {Object.entries(SUPPLIER_SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                Sort: {v.label}
              </option>
            ))}
          </Select>
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
            />
          ))}
          {suppliers.length > shownCount ? (
            <Button size="sm" variant="outline" onClick={() => setShownCount((n) => n + MOBILE_PAGE)}>
              Show more suppliers ({suppliers.length - shownCount} left)
            </Button>
          ) : null}
        </VStack>
      </CustomContainer>
    </GlobalWrapper>
  );
}
