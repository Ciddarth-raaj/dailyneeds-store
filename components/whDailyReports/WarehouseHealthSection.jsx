import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import Link from "next/link";
import toast from "react-hot-toast";
import WhDailyReportsHelper from "../../helper/whDailyReports";
import { exportToExcel } from "../../util/exportCSVFile";
import {
  BOX_STATUS,
  yesterdayIso,
  istTodayIso,
  istDateTimeText,
} from "../../util/whDailyReports";

/**
 * Warehouse Health - the warehouse manager's day, under Invoice Pipeline.
 * Yesterday by default. Picking write-off is counted in LINES (articles
 * short), valued at NLC. Tiles open their detail below them.
 */

const num = (v) => Math.round(Number(v) || 0).toLocaleString("en-IN");
const rupees = (v) => {
  const x = Number(v) || 0;
  if (x >= 1e7) return `₹${(x / 1e7).toFixed(2)} Cr`;
  if (x >= 1e5) return `₹${(x / 1e5).toFixed(2)} L`;
  return `₹${num(x)}`;
};
// Rounded down, so one mistake never shows as 100%.
const pct = (v) =>
  v == null ? "—" : `${(Math.floor(v * 1000) / 10).toFixed(1)}%`;
const title = (s) => {
  const t = String(s || "").trim();
  return t.length <= 3
    ? t.toUpperCase()
    : t.replace(/\b\w/g, (c) => c.toUpperCase());
};
const plural = (n, one, many = `${one}s`) =>
  `${num(n)} ${Number(n) === 1 ? one : many}`;
const dayText = (d) =>
  d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";
/** "STA 80 · GRN 26" from [{ job_type, lines }] or { STA: { lines } }. */
const typeSplit = (types) =>
  (Array.isArray(types)
    ? types
    : Object.entries(types || {}).map(([job_type, v]) => ({ job_type, ...v }))
  )
    .filter((t) => t.lines)
    .sort((a, b) => b.lines - a.lines)
    .map((t) => `${t.job_type} ${num(t.lines)}`)
    .join(" · ");
/** Loaded-but-not-unloaded boxes that are not problems: damage / returns going back to the warehouse. */
const NOT_A_PROBLEM = ["OPEN", "RETURN"];
/** "1 not unloaded · 1 damage return" - the loaded-but-not-unloaded boxes by why. */
const gapText = (list) => {
  const by = new Map();
  for (const b of list || []) by.set(b.status, (by.get(b.status) || 0) + 1);
  return [...by]
    .map(
      ([st, c]) =>
        `${num(c)} ${((BOX_STATUS[st] || {}).label || st).toLowerCase()}`,
    )
    .join(" · ");
};
const errMsg = (err, fallback) =>
  (err && err.response && err.response.data && err.response.data.msg) ||
  (err && err.message) ||
  fallback;

const TONE = {
  red: { bg: "red.50", border: "red.200", dot: "red.500", text: "red.800" },
  amber: {
    bg: "orange.50",
    border: "orange.200",
    dot: "orange.400",
    text: "orange.800",
  },
  green: {
    bg: "green.50",
    border: "green.200",
    dot: "green.500",
    text: "green.800",
  },
};

function Card({ children, ...rest }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
      {...rest}
    >
      {children}
    </Box>
  );
}

function Tile({ tone, label, value, sub, active, onClick }) {
  const t = TONE[tone] || TONE.green;
  return (
    <Box
      as="button"
      type="button"
      textAlign="left"
      onClick={onClick}
      bg={t.bg}
      borderWidth={active ? "2px" : "1px"}
      borderColor={active ? "teal.600" : t.border}
      borderRadius="xl"
      p={4}
      w="100%"
      _focus={{ boxShadow: "outline" }}
    >
      <Flex align="center" gap={2} mb={1}>
        <Box w="10px" h="10px" borderRadius="full" bg={t.dot} flexShrink={0} />
        <Text fontWeight="600" fontSize="sm" color="gray.700">
          {label}
        </Text>
      </Flex>
      <Text
        fontSize={{ base: "2xl", md: "3xl" }}
        fontWeight="700"
        lineHeight="1.2"
      >
        {value}
      </Text>
      <Text fontSize="sm" color="gray.600" mt={1}>
        {sub}
      </Text>
    </Box>
  );
}

function Bar({ value, max, color = "red.500" }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <Box bg="gray.100" h="8px" borderRadius="full" overflow="hidden">
      <Box bg={color} h="100%" w={`${w}%`} borderRadius="full" />
    </Box>
  );
}

function SimpleTable({ head, rows }) {
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            {head.map((h, i) => (
              <Th key={h} isNumeric={i > 0 && typeof rows[0]?.[i] === "number"}>
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r, k) => (
            // eslint-disable-next-line react/no-array-index-key
            <Tr key={k}>
              {r.map((c, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <Td key={i} isNumeric={typeof c === "number"}>
                  {typeof c === "number" ? num(c) : c}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

/** Boxes, each tappable to show the articles in it. */
function GapTable({ list }) {
  const [openBox, setOpenBox] = useState(null);
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Box</Th>
            <Th>Why</Th>
            <Th>To</Th>
            <Th>Truck</Th>
            <Th isNumeric>Articles</Th>
            <Th isNumeric>Qty</Th>
            <Th isNumeric>Value</Th>
          </Tr>
        </Thead>
        <Tbody>
          {list.map((b) => {
            const key = `${b.box_id}|${b.status}`;
            const isOpen = openBox === key;
            return (
              <React.Fragment key={key}>
                <Tr
                  cursor="pointer"
                  onClick={() => setOpenBox(isOpen ? null : key)}
                >
                  <Td>
                    {b.box_id}{" "}
                    <Text as="span" color="gray.400">
                      {isOpen ? "▲" : "▼"}
                    </Text>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={(BOX_STATUS[b.status] || {}).color || "gray"}
                    >
                      {(BOX_STATUS[b.status] || {}).label || b.status}
                    </Badge>
                  </Td>
                  <Td>
                    {title(b.store) +
                      (b.status === "WRONG_STORE" && b.unloaded_store
                        ? ` → ${title(b.unloaded_store)}`
                        : "")}
                  </Td>
                  <Td>{b.truck_no || "—"}</Td>
                  <Td isNumeric>{num(b.articles)}</Td>
                  <Td isNumeric>{num(b.qty)}</Td>
                  <Td isNumeric>{rupees(b.value)}</Td>
                </Tr>
                {isOpen && (
                  <Tr>
                    <Td colSpan={7} bg="gray.50">
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color="gray.600"
                        mb={1}
                      >
                        In this box: {plural(b.articles, "article")} ·{" "}
                        {num(b.qty)} qty
                      </Text>
                      {(b.items || []).map((it) => (
                        <Flex
                          key={it.article_id}
                          justify="space-between"
                          gap={3}
                          fontSize="sm"
                        >
                          <Text>
                            {it.article_name || "Article"}{" "}
                            <Text as="span" color="gray.500">
                              ({it.article_id})
                            </Text>
                          </Text>
                          <Text whiteSpace="nowrap">
                            {num(it.qty)} qty · {rupees(it.value)}
                          </Text>
                        </Flex>
                      ))}
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

/** Box trips of the chain, each tappable to show the articles in it. */
function ChainTable({ list, mode }) {
  const [openBox, setOpenBox] = useState(null);
  const late = mode === "closed";
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Box</Th>
            <Th>From → To</Th>
            <Th>Truck</Th>
            <Th>{mode === "not_loaded" ? "Unloaded" : "Loaded"}</Th>
            <Th isNumeric>
              {late ? "Days late" : mode === "not_loaded" ? "" : "Days open"}
            </Th>
            <Th isNumeric>Articles</Th>
            <Th isNumeric>Qty</Th>
            <Th isNumeric>Value</Th>
          </Tr>
        </Thead>
        <Tbody>
          {list.map((b, i) => {
            const key = `${b.box_id}|${b.job_id || i}`;
            const isOpen = openBox === key;
            const days = late ? b.days_late : b.days_open;
            return (
              <React.Fragment key={key}>
                <Tr
                  cursor="pointer"
                  onClick={() => setOpenBox(isOpen ? null : key)}
                  bg={days > 2 ? "red.50" : undefined}
                >
                  <Td>
                    {b.box_id}{" "}
                    <Text as="span" color="gray.400">
                      {isOpen ? "▲" : "▼"}
                    </Text>
                  </Td>
                  <Td>
                    {title(b.from_store)} → {title(b.to_store)}
                    {b.unloaded_store && b.unloaded_store !== b.to_store && (
                      <Text fontSize="xs" color="red.600">
                        unloaded at {title(b.unloaded_store)}
                      </Text>
                    )}
                  </Td>
                  <Td whiteSpace="nowrap">{b.truck_no || "—"}</Td>
                  <Td whiteSpace="nowrap">
                    {dayText(mode === "not_loaded" ? h_date(b) : b.loaded_on)}
                  </Td>
                  <Td isNumeric>{mode === "not_loaded" ? "" : num(days)}</Td>
                  <Td isNumeric>{num(b.articles)}</Td>
                  <Td isNumeric>{num(b.qty)}</Td>
                  <Td isNumeric>{rupees(b.value)}</Td>
                </Tr>
                {isOpen && (
                  <Tr>
                    <Td colSpan={8} bg="gray.50">
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        {b.job_id ? `Job ${b.job_id}` : "Uploaded file"}
                        {b.stage_id ? ` · Document ${b.stage_id}` : ""}
                        {b.job_type ? ` · ${b.job_type}` : ""}
                      </Text>
                      {(b.items || []).map((it) => (
                        <Flex
                          key={it.article_id}
                          justify="space-between"
                          gap={3}
                          fontSize="sm"
                        >
                          <Text>
                            {it.article_name || "Article"}{" "}
                            <Text as="span" color="gray.500">
                              ({it.article_id})
                            </Text>
                          </Text>
                          <Text whiteSpace="nowrap">
                            {num(it.qty)} qty · {rupees(it.value)}
                          </Text>
                        </Flex>
                      ))}
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
const h_date = (b) => b.unloaded_on || b.loaded_on || null;

/** Unloading as a running ledger of box trips (from the chain start). */
function UnloadingChain({ u }) {
  const c = u.chain;
  const row = (sign, label, boxes, note, strong) => (
    <Tr>
      <Td w="24px" fontWeight="700" color="gray.500">
        {sign}
      </Td>
      <Td fontWeight={strong ? "700" : "400"}>{label}</Td>
      <Td isNumeric fontWeight={strong ? "700" : "400"}>
        {num(boxes)}
      </Td>
      <Td fontSize="sm" color="gray.600">
        {note}
      </Td>
    </Tr>
  );
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={1}>
        Unloading - box chain
      </Text>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Every box trip followed from loading to unloading since{" "}
        {dayText(c.from)}. Open from earlier days + loaded − unloaded = still
        open.
      </Text>
      {c.missing_days.length > 0 && (
        <Box
          bg="orange.50"
          borderWidth="1px"
          borderColor="orange.200"
          borderRadius="md"
          p={3}
          mb={3}
        >
          <Text fontSize="sm" color="orange.800">
            {plural(c.missing_days.length, "day")} since {dayText(c.from)} have
            no Loading or Unloading report, so the chain may miss boxes - pull
            them on Daily Uploads:{" "}
            {c.missing_days
              .slice(0, 8)
              .map((m) => dayText(m.date))
              .join(", ")}
            {c.missing_days.length > 8
              ? ` and ${c.missing_days.length - 8} more`
              : ""}
            .
          </Text>
        </Box>
      )}
      <Box overflowX="auto" mb={4}>
        <Table size="sm">
          <Tbody>
            {row(
              "",
              "Open from earlier days",
              c.opening.boxes,
              `${num(c.opening.qty)} qty`,
            )}
            {row(
              "+",
              "Loaded today",
              c.loaded.boxes,
              `on ${plural(c.loaded.trucks, "truck")}`,
            )}
            {row(
              "−",
              "Unloaded today",
              c.unloaded.boxes,
              `${num(c.unloaded.from_today)} from today's loading · ${num(c.unloaded.from_earlier)} from earlier days`,
            )}
            {row(
              "=",
              "Still open",
              c.still_open.boxes,
              c.still_open.boxes
                ? `${num(c.still_open.qty)} qty · ${rupees(c.still_open.value)}${c.still_open.older ? ` · oldest ${plural(c.still_open.oldest_days, "day")}` : ""}`
                : "nothing open",
              true,
            )}
          </Tbody>
        </Table>
      </Box>
      <Text fontWeight="600" mb={1}>
        Still open - loaded, not unloaded ({num(u.still_open.length)})
      </Text>
      {u.still_open.length ? (
        <ChainTable list={u.still_open} mode="open" />
      ) : (
        <Text color="gray.500" mb={2}>
          Every box loaded has been unloaded.
        </Text>
      )}
      {u.closed_old.length > 0 && (
        <Box mt={4}>
          <Text fontWeight="600" mb={1}>
            Closed today - loaded on an earlier day ({num(u.closed_old.length)})
          </Text>
          <ChainTable list={u.closed_old} mode="closed" />
        </Box>
      )}
      {c.wrong_store.boxes > 0 && (
        <Box mt={4}>
          <Text fontWeight="600" mb={1}>
            Unloaded at the wrong store ({num(c.wrong_store.boxes)})
          </Text>
          <ChainTable
            list={u.list.filter((b) => b.status === "WRONG_STORE")}
            mode="closed"
          />
        </Box>
      )}
      {c.not_loaded.boxes > 0 && (
        <Box mt={4}>
          <Text fontWeight="600" mb={1}>
            Unloaded today, no loading since {dayText(c.from)} (
            {num(c.not_loaded.boxes)})
          </Text>
          <ChainTable
            list={u.list.filter((b) => b.status === "NOT_LOADED")}
            mode="not_loaded"
          />
        </Box>
      )}
    </Card>
  );
}

/** Every picking write-off line of the day: what, where, who, when - filter by job type and store, download. */
function WriteoffLines({ list, date }) {
  const [type, setType] = useState("ALL");
  const [store, setStore] = useState("ALL");
  if (!list || !list.length) return null;
  const types = ["ALL", ...[...new Set(list.map((l) => l.job_type))].sort()];
  const stores = [
    "ALL",
    ...[...new Set(list.map((l) => l.to_store).filter(Boolean))].sort(),
  ];
  const shown = list.filter(
    (l) =>
      (type === "ALL" || l.job_type === type) &&
      (store === "ALL" || l.to_store === store),
  );
  const qty = shown.reduce((s, l) => s + l.short_qty, 0);
  const value = shown.reduce((s, l) => s + l.value, 0);
  const download = () =>
    exportToExcel(
      [
        shown.map((l) => ({
          Article: l.article_name || "",
          "Article ID": l.article_id,
          Department: l.department || "",
          "Job type": l.job_type,
          From: title(l.from_store),
          To: title(l.to_store),
          "To pick": l.advised_qty,
          Picked: l.picked_qty,
          Short: l.short_qty,
          NLC: l.nlc,
          "Short value": l.value,
          Picker: l.picker_name || "",
          "Picker ID": l.picker || "",
          "Finished (IST)": l.finished_at || "",
          Job: l.job_id || "",
          Document: l.stage_id || "",
        })),
      ],
      ["Picking write-off"],
      `picking-write-off-${date}.xlsx`,
    );
  return (
    <Box mt={5}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
        <Text fontWeight="700">
          Every line · {plural(shown.length, "line")} · {num(qty)} qty ·{" "}
          {rupees(value)}
        </Text>
        <Button size="sm" variant="outline" onClick={download}>
          Download
        </Button>
      </Flex>
      <Flex gap={2} wrap="wrap" mb={3}>
        {types.map((x) => (
          <Button
            key={x}
            size="sm"
            minH="36px"
            variant={type === x ? "solid" : "outline"}
            colorScheme="purple"
            onClick={() => setType(x)}
          >
            {x === "ALL" ? "All types" : x}
          </Button>
        ))}
        <Select
          size="sm"
          w="auto"
          minH="36px"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          aria-label="Write-off store"
        >
          {stores.map((x) => (
            <option key={x} value={x}>
              {x === "ALL" ? "All stores" : title(x)}
            </option>
          ))}
        </Select>
      </Flex>
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Article</Th>
              <Th>From → To</Th>
              <Th>Type</Th>
              <Th isNumeric>Picked / to pick</Th>
              <Th isNumeric>Short</Th>
              <Th isNumeric>Value</Th>
              <Th>Picker</Th>
              <Th>When</Th>
              <Th>Job</Th>
            </Tr>
          </Thead>
          <Tbody>
            {shown.slice(0, 500).map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Tr key={i}>
                <Td minW="180px">
                  {l.article_name || "Article"}{" "}
                  <Text as="span" color="gray.500" fontSize="xs">
                    ({l.article_id})
                  </Text>
                </Td>
                <Td whiteSpace="nowrap">
                  {title(l.from_store)} → {title(l.to_store)}
                </Td>
                <Td>{l.job_type}</Td>
                <Td isNumeric whiteSpace="nowrap">
                  {num(l.picked_qty)} / {num(l.advised_qty)}
                </Td>
                <Td isNumeric fontWeight="700">
                  {num(l.short_qty)}
                </Td>
                <Td isNumeric>{l.nlc == null ? "—" : rupees(l.value)}</Td>
                <Td whiteSpace="nowrap">
                  {l.picker_name || "—"}
                  {l.picker && !l.picker_mapped && (
                    <Text fontSize="xs" color="gray.500">
                      not mapped
                    </Text>
                  )}
                </Td>
                <Td whiteSpace="nowrap">
                  {l.finished_at ? l.finished_at.slice(11, 16) : "—"}
                </Td>
                <Td fontSize="xs" whiteSpace="nowrap">
                  {l.job_id || "—"}
                  {l.stage_id && <Text color="gray.500">{l.stage_id}</Text>}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {shown.length > 500 && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Showing 500 of {num(shown.length)} - download for all.
        </Text>
      )}
      {list.some((l) => !l.finished_at) && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          &quot;When&quot; shows from the next pull; pull the day again on Daily
          Uploads to fill it.
        </Text>
      )}
    </Box>
  );
}

function Detail({ open, h }) {
  if (!open) return null;
  const t = h.tiles;
  if (open === "writeoff") {
    const rows = h.stores.filter((s) => s.picking_short_lines);
    const max = Math.max(0, ...rows.map((s) => s.picking_short_lines));
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={3}>
          Picking write-off by store
        </Text>
        {(t.writeoff.by_job_type || []).length > 0 && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
            {t.writeoff.by_job_type.map((j) => (
              <Box
                key={j.job_type}
                bg="red.50"
                borderWidth="1px"
                borderColor="red.100"
                borderRadius="lg"
                p={3}
              >
                <Text fontSize="xs" fontWeight="700" color="gray.600">
                  {j.job_type}
                </Text>
                <Text fontWeight="700" fontSize="xl">
                  {plural(j.lines, "line")}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {rupees(j.value)} · {num(j.qty)} qty
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        )}
        {!rows.length && <Text color="gray.500">No picking write-off.</Text>}
        <Stack spacing={3}>
          {rows.map((s) => (
            <Box key={s.store}>
              <Flex justify="space-between" mb={1} gap={2}>
                <Text fontWeight="600">{s.name}</Text>
                <Text fontSize="sm">
                  {plural(s.picking_short_lines, "line")} ·{" "}
                  {rupees(s.picking_short_value)}
                  <Text as="span" color="gray.500">
                    {" "}
                    ({num(s.picking_short_qty)} qty)
                  </Text>
                </Text>
              </Flex>
              <Bar value={s.picking_short_lines} max={max} />
              {typeSplit(s.picking_by_type) && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {typeSplit(s.picking_by_type)}
                </Text>
              )}
            </Box>
          ))}
        </Stack>
        {t.writeoff.packing_lines > 0 && (
          <Text fontSize="sm" color="gray.600" mt={3}>
            Packing write-off: {plural(t.writeoff.packing_lines, "line")} ·{" "}
            {rupees(t.writeoff.packing_value)}
          </Text>
        )}
        <WriteoffLines list={t.writeoff.list} date={h.date} />
      </Card>
    );
  }
  if (open === "loading") {
    const l = t.loading;
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={1}>
          Loading
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          {plural(l.boxes, "box", "boxes")} on the loading list ·{" "}
          {num(l.on_truck)} put on {plural(l.trucks, "truck")}.{" "}
          <b>Not on a truck</b>: on the loading list, never put on a truck
          (still at the warehouse).
        </Text>
        {!l.list.length && (
          <Text color="gray.500">Every box on the list went on a truck.</Text>
        )}
        {l.list.length > 0 && <GapTable list={l.list} />}
      </Card>
    );
  }
  if (open === "unloading" && t.unloading.chain)
    return <UnloadingChain u={t.unloading} />;
  if (open === "unloading") {
    const u = t.unloading;
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={1}>
          Unloading
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          {num(u.unloaded_boxes)} of {plural(u.loaded_boxes, "box", "boxes")} on
          trucks unloaded. Checked by box: not unloaded {num(u.not_unloaded)} ·
          wrong store {num(u.wrong_store)} · unloaded but not loaded{" "}
          {num(u.not_loaded)}. Articles inside a box are checked at store
          verification.
        </Text>
        {!u.list.length && (
          <Text color="gray.500" mb={u.waiting.length ? 3 : 0}>
            No unloading problems.
          </Text>
        )}
        {u.list.length > 0 && (
          <Box mb={u.waiting.length ? 4 : 0}>
            <GapTable list={u.list} />
          </Box>
        )}
        {u.waiting.length > 0 && (
          <Box>
            <Text fontWeight="600" mb={1}>
              Damage returns going back to the warehouse - not a problem (
              {gapText(u.waiting)})
            </Text>
            <GapTable list={u.waiting} />
          </Box>
        )}
      </Card>
    );
  }
  if (open === "verification") {
    const v = t.verification;
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={1}>
          Verification
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Stores found {plural(v.short_lines, "line")} short (
          {rupees(v.short_value)}). {plural(v.verified_lines, "line")} verified.
        </Text>
        <Text fontWeight="600" mb={2}>
          Yet to verify
        </Text>
        {!v.yet_to_verify.length && (
          <Text color="gray.500">Nothing waiting.</Text>
        )}
        {v.yet_to_verify.length > 0 && (
          <SimpleTable
            head={["Where", "From", "Item", "Qty", "Value"]}
            rows={v.yet_to_verify.map((p) => [
              <Flex key="w" gap={2} align="center">
                {title(p.to_store)}
                {p.is_return && (
                  <Badge colorScheme="purple">Return to warehouse</Badge>
                )}
              </Flex>,
              title(p.from_store),
              p.article_name || p.article_id,
              p.qty,
              rupees(p.value),
            ])}
          />
        )}
      </Card>
    );
  }
  return null;
}

function Repeats({ rows }) {
  if (!rows.length) return null;
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={1}>
        Short again and again
      </Text>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Picking write-off on 2 or more of the last 7 days - check the stock /
        bin
      </Text>
      <SimpleTable
        head={["Item", "Days short", "Lines", "Value", "Stores"]}
        rows={rows.map((a) => [
          a.article_name || a.article_id,
          a.days_short,
          a.lines,
          rupees(a.short_value),
          String(a.stores || "")
            .split(",")
            .map(title)
            .join(", "),
        ])}
      />
    </Card>
  );
}

function PickerTable({ rows }) {
  const [openId, setOpenId] = useState(null);
  return (
    <Box overflowX="auto">
      <Table size="sm" sx={{ "th, td": { px: { base: 2, md: 4 } } }}>
        <Thead>
          <Tr>
            <Th>Picker</Th>
            <Th isNumeric>Lines</Th>
            <Th isNumeric>Value (NLC)</Th>
            <Th isNumeric>Accuracy</Th>
            <Th isNumeric>Mistakes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((p) => (
            <React.Fragment key={p.id}>
              <Tr
                bg={p.below_target ? "red.50" : undefined}
                cursor={p.mistakes.length ? "pointer" : undefined}
                onClick={() =>
                  p.mistakes.length && setOpenId(openId === p.id ? null : p.id)
                }
              >
                <Td>
                  <Text fontWeight="600">{p.name}</Text>
                  {!p.mapped && (
                    <Text fontSize="xs" color="gray.500">
                      Not mapped yet
                    </Text>
                  )}
                </Td>
                <Td isNumeric>{num(p.lines)}</Td>
                <Td isNumeric>{rupees(p.value)}</Td>
                <Td isNumeric>
                  <Badge
                    colorScheme={
                      p.accuracy == null
                        ? "gray"
                        : p.below_target
                          ? "red"
                          : "green"
                    }
                  >
                    {pct(p.accuracy)}
                  </Badge>
                </Td>
                <Td isNumeric>
                  {num(p.mistake_lines)}
                  {p.mistake_value > 0 && (
                    <Text fontSize="xs" color="gray.500">
                      {rupees(p.mistake_value)}
                    </Text>
                  )}
                </Td>
              </Tr>
              {openId === p.id && (
                <Tr>
                  <Td colSpan={5} bg="gray.50">
                    {p.mistakes.map((m, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Text key={i} fontSize="sm">
                        {dayText(m.date)} · {title(m.store)} ·{" "}
                        {m.article_name || m.article_id} · {num(m.short_qty)}{" "}
                        short · {rupees(m.value)}
                      </Text>
                    ))}
                  </Td>
                </Tr>
              )}
            </React.Fragment>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

function Pickers({ rows, groups, target, from, to }) {
  const list = (groups || [{ key: "all", label: "", rows }]).filter(
    (g) => g.rows.length,
  );
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={1}>
        Pickers this month
      </Text>
      <Text fontSize="sm" color="gray.600" mb={3}>
        {dayText(from)} to {dayText(to)}. Mistakes = shortages the store found
        at verification in goods they picked. Below {Math.round(target * 100)}%
        accuracy is flagged. Names come from HR → RetailPilot Staff Mapping.
      </Text>
      {!list.length && (
        <Text color="gray.500">
          No picking recorded with a picker this month.
        </Text>
      )}
      <Stack spacing={5}>
        {list.map((g) => (
          <Box key={g.key}>
            {g.label && (
              <Text fontWeight="700" color="purple.700" mb={1}>
                {g.label}
              </Text>
            )}
            <PickerTable rows={g.rows} />
          </Box>
        ))}
      </Stack>
    </Card>
  );
}

/** One waiting line traced through every stage: what we hold, how it links, which days were pulled. */
function TraceView({ line }) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  useEffect(() => {
    let live = true;
    WhDailyReportsHelper.trace({
      stage_id: line.stage_id || undefined,
      article_id: line.article_id,
      to_store: line.to_store,
    })
      .then(
        (res) =>
          live &&
          setState(
            res && res.code === 200
              ? { loading: false, data: res.data, error: null }
              : {
                  loading: false,
                  data: null,
                  error: (res && res.msg) || "Could not trace",
                },
          ),
      )
      .catch(
        (err) =>
          live &&
          setState({
            loading: false,
            data: null,
            error: errMsg(err, "Could not trace"),
          }),
      );
    return () => {
      live = false;
    };
  }, [line.stage_id, line.article_id, line.to_store]);
  if (state.loading) return <Spinner size="sm" />;
  if (state.error) return <Text color="red.600">{state.error}</Text>;
  const d = state.data;
  const STAGES = [
    ["PICKING", "Picked"],
    ["PACKING", "Packed"],
    ["LOADING", "Loaded"],
    ["UNLOADING", "Unloaded"],
    ["VERIFICATION", "Verified"],
  ];
  const days = Object.keys(d.pulled).sort();
  const box = (k) => k === "LOADING" || k === "UNLOADING";
  return (
    <Box fontSize="sm">
      {STAGES.map(([k, label]) => {
        const rows = d.stages[k] || [];
        return (
          <Box key={k} mb={3}>
            <Text fontWeight="700" color={rows.length ? "gray.800" : "red.700"}>
              {label} ·{" "}
              {rows.length
                ? `${num(rows.reduce((s, r) => s + (box(k) ? r.qty : r.actual_qty), 0))} qty in ${plural(rows.length, box(k) ? "box" : "line", box(k) ? "boxes" : "lines")}`
                : "nothing found in our data"}
            </Text>
            {rows.map((r, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Text key={i} color="gray.700" pl={3}>
                {dayText(r.report_date)} · job {r.job_id || "—"}
                {box(k)
                  ? ` · box ${r.box_id} · ${num(r.qty)} qty${r.truck_no ? ` · truck ${r.truck_no}` : ""}${r.unloaded_store && r.unloaded_store !== r.planned_to_store ? ` · unloaded at ${title(r.unloaded_store)}` : ""}${r.links && r.links.length ? ` · from ${r.links.join(", ")}` : " · no job link (pull again)"}${r.linked ? " ✓" : ""}`
                  : ` · ${r.job_state || (r.open_jobs ? "open" : "done")} · ${num(r.actual_qty)} of ${num(r.advised_qty)}${r.short_qty ? ` · ${num(r.short_qty)} short` : ""}${r.worker_name || r.worked_by ? ` · ${r.worker_name || r.worked_by}` : ""}${k === "PACKING" && r.picking_job ? ` · from ${r.picking_job}` : ""}${k === "VERIFICATION" && r.unloading_job ? ` · from ${r.unloading_job}` : ""}`}
                {r.finished_at ? ` · ${r.finished_at.slice(11, 16)}` : ""}
              </Text>
            ))}
          </Box>
        );
      })}
      {days.length > 0 && (
        <Box mt={2}>
          <Text fontWeight="700">Reports pulled on these days</Text>
          {days.map((day) => {
            const have = d.pulled[day];
            const lacks = [
              "PICKING",
              "PACKING",
              "LOADING",
              "UNLOADING",
              "VERIFICATION",
            ].filter((t) => !have.includes(t));
            return (
              <Text
                key={day}
                pl={3}
                color={lacks.length ? "orange.700" : "gray.700"}
              >
                {dayText(day)}:{" "}
                {lacks.length
                  ? `missing ${lacks.map((t) => t.charAt(0) + t.slice(1).toLowerCase()).join(", ")} - pull this day again`
                  : "all 5"}
              </Text>
            );
          })}
        </Box>
      )}
      <Text fontSize="xs" color="gray.500" mt={2}>
        ✓ = the box names one of this document&apos;s jobs. Boxes without a job
        link were pulled before links were kept.
      </Text>
    </Box>
  );
}

/** The waiting lines of one gap: document · article · lane, qty, value, since - tap a line to trace it. */
function WaitingLines({ list, mode }) {
  const [openRow, setOpenRow] = useState(null);
  if (!list.length)
    return (
      <Text color="gray.500" fontSize="sm">
        Nothing here.
      </Text>
    );
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Article</Th>
            <Th>Document</Th>
            <Th>From → To</Th>
            <Th isNumeric>Qty</Th>
            <Th isNumeric>Value</Th>
            <Th isNumeric>{mode === "jumped" ? "" : "Waiting"}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {list.map((l, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={i}>
              <Tr
                bg={l.days > 2 ? "red.50" : undefined}
                cursor="pointer"
                onClick={() => setOpenRow(openRow === i ? null : i)}
              >
                <Td>
                  {l.article_name || "Article"}{" "}
                  <Text as="span" color="gray.500" fontSize="xs">
                    ({l.article_id}) {openRow === i ? "▲" : "▼ trace"}
                  </Text>
                </Td>
                <Td fontSize="xs">{l.stage_id || "—"}</Td>
                <Td whiteSpace="nowrap">
                  {title(l.from_store)} → {title(l.to_store)}
                </Td>
                <Td isNumeric>{num(l.qty)}</Td>
                <Td isNumeric>{rupees(l.value)}</Td>
                <Td isNumeric whiteSpace="nowrap">
                  {mode === "jumped"
                    ? ""
                    : l.days
                      ? plural(l.days, "day")
                      : "today"}
                </Td>
              </Tr>
              {openRow === i && (
                <Tr>
                  <Td colSpan={6} bg="gray.50">
                    <TraceView line={l} />
                  </Td>
                </Tr>
              )}
            </React.Fragment>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

/**
 * Where the stored chain stands: it is worked out once per day in the
 * background (after the nightly pull, and again after any re-pull), never on
 * a page view.
 */
function ChainStatus({ st, has }) {
  if (!st) return null;
  const p = st.progress || {};
  const total = (p.todo || 0) + (p.done || 0) + (p.failed || 0);
  if (p.failed) {
    return (
      <Box
        bg="orange.50"
        borderWidth="1px"
        borderColor="orange.200"
        borderRadius="lg"
        px={4}
        py={3}
      >
        <Text fontSize="sm" color="orange.800">
          The chain could not be worked out for {plural(p.failed, "day")}
          {p.first_todo ? ` (from ${dayText(p.first_todo)})` : ""} - pulling
          that day again on Daily Uploads retries it.
        </Text>
      </Box>
    );
  }
  if (p.todo) {
    const pct = total ? Math.round(((p.done || 0) / total) * 100) : 0;
    return (
      <Box
        bg="blue.50"
        borderWidth="1px"
        borderColor="blue.200"
        borderRadius="lg"
        px={4}
        py={3}
      >
        <Text fontSize="sm" fontWeight="600" color="blue.800">
          {p.first_todo
            ? `Updating the chain from ${dayText(p.first_todo)}`
            : "Updating the chain"}
        </Text>
        <Box bg="blue.100" h="8px" borderRadius="full" my={2} overflow="hidden">
          <Box bg="blue.500" h="8px" w={`${pct}%`} />
        </Box>
        <Text fontSize="xs" color="blue.800">
          {num(p.done || 0)} of {num(total)} days done ·{" "}
          {has
            ? "the numbers below are from before the update until it finishes"
            : "the chain shows here once this day is worked out"}{" "}
          (a few minutes)
        </Text>
      </Box>
    );
  }
  return st.computed_at ? (
    <Text fontSize="xs" color="gray.500">
      Chain worked out {istDateTimeText(st.computed_at)}
    </Text>
  ) : null;
}

/** A gap's waiting lines: those waiting 2 days or more; the newer ones behind "Show all". */
function StuckFirst({ list }) {
  const [all, setAll] = useState(false);
  const stuck = list.filter((l) => l.days >= 2);
  const newer = list.length - stuck.length;
  return (
    <Box>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
        <Text fontSize="sm" fontWeight="600">
          {all
            ? `All ${plural(list.length, "line")}`
            : `${plural(stuck.length, "line")} waiting 2 days or more`}
        </Text>
        {newer > 0 && (
          <Button
            size="sm"
            variant="outline"
            minH="36px"
            onClick={() => setAll((v) => !v)}
          >
            {all ? "Only 2 days or more" : `Show all (+${num(newer)} newer)`}
          </Button>
        )}
      </Flex>
      {!all && !stuck.length ? (
        <Text color="gray.500" fontSize="sm">
          Nothing has waited 2 days or more.
        </Text>
      ) : (
        <WaitingLines list={all ? list : stuck} />
      )}
    </Box>
  );
}

/** What the next stage found short today, line by line: article, document, store, qty, value, who, when. */
function FoundShort({ gapKey, lost }) {
  if (!lost || !lost.lines) return null;
  const title_ =
    {
      to_pack: "Packed less than picked today",
      to_load: "Found short while splitting into cartons today",
      to_verify: "Verified today with issues - found short at the store",
    }[gapKey] || "Found short today";
  const list = lost.list || [];
  return (
    <Box mt={4}>
      <Text fontWeight="700" color="red.700" mb={1}>
        {title_} · {plural(lost.lines, "line")} · {num(lost.qty)} qty ·{" "}
        {rupees(lost.value)}
      </Text>
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Article</Th>
              <Th>Document</Th>
              <Th>From → To</Th>
              <Th isNumeric>Short</Th>
              <Th isNumeric>Value</Th>
              <Th>By</Th>
              <Th>When</Th>
              <Th>Job</Th>
            </Tr>
          </Thead>
          <Tbody>
            {list.map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Tr key={i} bg="red.50">
                <Td minW="160px">
                  {l.article_name || "Article"}{" "}
                  <Text as="span" color="gray.500" fontSize="xs">
                    ({l.article_id})
                  </Text>
                </Td>
                <Td fontSize="xs">{l.stage_id || "—"}</Td>
                <Td whiteSpace="nowrap">
                  {title(l.from_store)} → {title(l.to_store)}
                </Td>
                <Td isNumeric fontWeight="700">
                  {num(l.qty)}
                </Td>
                <Td isNumeric>{rupees(l.value)}</Td>
                <Td whiteSpace="nowrap">
                  {l.worker_name || l.worked_by || "—"}
                </Td>
                <Td whiteSpace="nowrap">
                  {l.finished_at
                    ? `${dayText(l.finished_at.slice(0, 10))} ${l.finished_at.slice(11, 16)}`
                    : "—"}
                </Td>
                <Td fontSize="xs">{l.job_id || "—"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {!list.length && (
        <Text fontSize="xs" color="gray.500">
          The lines show once the chain is worked out again (a few minutes after
          the next update).
        </Text>
      )}
    </Box>
  );
}

/**
 * The stage chain at the top of Warehouse Health: Picked -> Packed ->
 * Loaded -> Unloaded -> Verified, and what stands between each two stages
 * tonight - waiting from earlier + arrived - moved on = stands here.
 */
function StageChain({ sc, unloading, notOnTruck }) {
  const [openGap, setOpenGap] = useState(null);
  const g = Object.fromEntries(sc.gaps.map((x) => [x.key, x]));
  const b = sc.boxes;
  const stage = (n, label, main, sub, bad) => (
    <Flex align="center" gap={3}>
      <Flex
        w="34px"
        h="34px"
        borderRadius="full"
        bg="purple.700"
        color="white"
        align="center"
        justify="center"
        fontWeight="700"
        fontSize="sm"
        flexShrink={0}
      >
        {n}
      </Flex>
      <Box>
        <Text fontWeight="600">{label}</Text>
        <Text fontSize="sm" color="gray.600">
          {main}
          {sub ? " · " : ""}
          {sub ? (
            <Text
              as="span"
              color={bad ? "red.600" : undefined}
              fontWeight={bad ? "600" : undefined}
            >
              {sub}
            </Text>
          ) : null}
        </Text>
      </Box>
    </Flex>
  );
  const waitTag = (key, text, bad, onClick) => (
    <Box
      ml="16px"
      borderLeftWidth="2px"
      borderStyle="dashed"
      borderColor={bad ? "red.200" : "gray.300"}
      py={2}
      pl={6}
    >
      <Button
        size="sm"
        variant="ghost"
        h="auto"
        minH="32px"
        py={1}
        px={2}
        whiteSpace="normal"
        textAlign="left"
        bg={bad ? "red.50" : "yellow.50"}
        color={bad ? "red.800" : "yellow.900"}
        fontWeight="600"
        onClick={onClick}
      >
        {text}
      </Button>
    </Box>
  );
  const gapText = (x) =>
    x.stands
      ? `${num(x.stands)} qty in ${plural(x.lines, "line")} waiting${x.oldest_days ? ` · oldest ${plural(x.oldest_days, "day")}` : ""}`
      : "nothing waiting";
  const rows = [
    { key: "to_pack", x: g.to_pack },
    { key: "to_load", x: g.to_load },
    b
      ? {
          key: "to_unload",
          box: true,
          label: "Loaded, not yet unloaded",
          from_earlier: b.opening.boxes,
          arrived: b.loaded.boxes,
          moved_on: b.unloaded.boxes,
          stands: b.still_open.boxes,
          oldest: b.still_open.oldest_days,
          unit: "boxes",
        }
      : null,
    { key: "to_verify", x: g.to_verify },
  ].filter(Boolean);
  const open = openGap && g[openGap];
  return (
    <Card>
      <Flex justify="space-between" align="baseline" wrap="wrap" gap={2} mb={3}>
        <Text fontWeight="700" fontSize="lg">
          Where everything stands tonight
        </Text>
        <Text fontSize="xs" color="gray.500">
          followed by document since {dayText(sc.from)}
        </Text>
      </Flex>
      {sc.days_without_state.length > 0 && (
        <Box
          bg="orange.50"
          borderWidth="1px"
          borderColor="orange.200"
          borderRadius="md"
          p={3}
          mb={3}
        >
          <Text fontSize="sm" color="orange.800">
            {plural(sc.days_without_state.length, "day")} since{" "}
            {dayText(sc.from)} were pulled before each line kept the job it came
            from (or were uploaded as files), so goods on those days can show as
            waiting when they moved on - cartons reuse their barcode, only the
            job links them exactly. Pull them again on Daily Uploads:{" "}
            {sc.days_without_state
              .slice(0, 10)
              .map((d) => dayText(d))
              .join(", ")}
            {sc.days_without_state.length > 10
              ? ` and ${sc.days_without_state.length - 10} more`
              : ""}
            .
          </Text>
        </Box>
      )}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box>
          {stage(1, "Picked", `${num(sc.stages.picked)} qty today`)}
          {waitTag(
            "to_pack",
            `Waiting to be packed: ${gapText(g.to_pack)}`,
            g.to_pack.stuck > 0,
            () => setOpenGap(openGap === "to_pack" ? null : "to_pack"),
          )}
          {stage(2, "Packed", `${num(sc.stages.packed)} qty today`)}
          {waitTag(
            "to_load",
            `Waiting to be loaded: ${gapText(g.to_load)}`,
            g.to_load.stuck > 0,
            () => setOpenGap(openGap === "to_load" ? null : "to_load"),
          )}
          {stage(
            3,
            "Loaded",
            b
              ? `${plural(b.loaded.boxes, "box", "boxes")} on ${plural(b.loaded.trucks, "truck")}`
              : `${num(sc.stages.loaded)} qty`,
            notOnTruck ? `${num(notOnTruck)} not on a truck` : "",
            Boolean(notOnTruck),
          )}
          {b &&
            waitTag(
              "to_unload",
              `Waiting to be unloaded: ${b.still_open.boxes ? `${plural(b.still_open.boxes, "box", "boxes")} · ${num(b.still_open.qty)} qty${b.still_open.oldest_days ? ` · oldest ${plural(b.still_open.oldest_days, "day")}` : ""}` : "nothing waiting"}`,
              b.still_open.boxes > 0,
              () => setOpenGap(openGap === "to_unload" ? null : "to_unload"),
            )}
          {stage(
            4,
            "Unloaded",
            b
              ? `${plural(b.unloaded.boxes, "box", "boxes")}${b.unloaded.from_earlier ? ` · ${num(b.unloaded.from_earlier)} from earlier days` : ""}`
              : `${num(sc.stages.unloaded)} qty`,
          )}
          {waitTag(
            "to_verify",
            `Waiting to be verified: ${gapText(g.to_verify)}`,
            g.to_verify.stuck > 0 || g.to_verify.stands > 0,
            () => setOpenGap(openGap === "to_verify" ? null : "to_verify"),
          )}
          {stage(5, "Verified", `${num(sc.stages.verified)} qty today`)}
        </Box>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Waiting to be</Th>
                <Th isNumeric>From earlier</Th>
                <Th isNumeric>+ Arrived</Th>
                <Th isNumeric>− Moved on</Th>
                <Th isNumeric>= Tonight</Th>
                <Th isNumeric>Oldest</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => {
                const x = r.x || r;
                const label = r.x
                  ? r.x.label.replace(", not yet ", " → ")
                  : "Loaded → unloaded";
                return (
                  <Tr
                    key={r.key}
                    cursor="pointer"
                    onClick={() => setOpenGap(openGap === r.key ? null : r.key)}
                    bg={openGap === r.key ? "purple.50" : undefined}
                  >
                    <Td>
                      <Text fontWeight="600">{label}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {r.box ? "boxes" : "qty"}
                      </Text>
                    </Td>
                    <Td isNumeric>{num(x.from_earlier)}</Td>
                    <Td isNumeric>{num(x.arrived)}</Td>
                    <Td isNumeric>{num(x.moved_on)}</Td>
                    <Td
                      isNumeric
                      fontWeight="700"
                      color={x.stands ? "red.700" : undefined}
                    >
                      {num(x.stands)}
                    </Td>
                    <Td isNumeric whiteSpace="nowrap">
                      {x.stands
                        ? plural(r.box ? x.oldest : x.oldest_days, "day")
                        : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <Text fontSize="xs" color="gray.500" mt={2}>
            From earlier + arrived − moved on = tonight. Moved on includes what
            the next stage found short. Tap a row to see the lines.
          </Text>
        </Box>
      </SimpleGrid>
      {openGap === "to_unload" && unloading && unloading.chain && (
        <Box mt={4}>
          <UnloadingChain u={unloading} />
        </Box>
      )}
      {open && (
        <Box mt={4} borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Text fontWeight="700" mb={1}>
            {open.label} · {num(open.stands)} qty · {rupees(open.value)}
          </Text>
          <Text fontSize="sm" color="gray.600" mb={2}>
            {plural(open.lines, "line")}
            {open.stuck ? ` · ${num(open.stuck)} waiting more than 2 days` : ""}
            {open.lost.lines
              ? ` · lost today: ${num(open.lost.qty)} qty found short at the next stage`
              : ""}
          </Text>
          <StuckFirst list={open.list} />
          <FoundShort gapKey={openGap} lost={open.lost} />
          {open.jumped.lines > 0 && (
            <Box mt={4}>
              <Text fontWeight="600" mb={1} color="orange.800">
                Skipped this stage today - reached the next stage with no record
                here ({plural(open.jumped.lines, "line")})
              </Text>
              <WaitingLines list={open.jumped.list} mode="jumped" />
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
}

export default function WarehouseHealthSection() {
  const [date, setDate] = useState(() => yesterdayIso());
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });
  const [open, setOpen] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    WhDailyReportsHelper.health({ date })
      .then((res) => {
        if (res && res.code === 200)
          setState({ loading: false, error: null, data: res.data });
        else
          setState({
            loading: false,
            error: (res && res.msg) || "Could not load Warehouse Health",
            data: null,
          });
      })
      .catch((err) =>
        setState({
          loading: false,
          error: errMsg(err, "Could not load Warehouse Health"),
          data: null,
        }),
      );
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hash === "#warehouse-health"
    ) {
      const el = document.getElementById("warehouse-health");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.data]);

  const sendMe = async () => {
    setSending(true);
    try {
      const res = await WhDailyReportsHelper.sendHealthToMe();
      if (res && res.code === 200) toast.success("Sent to your Telegram");
      else toast.error((res && res.msg) || "Could not send");
    } catch (err) {
      toast.error(errMsg(err, "Could not send"));
    } finally {
      setSending(false);
    }
  };

  const h = state.data;
  const toggle = (k) => setOpen((o) => (o === k ? null : k));

  return (
    <Box id="warehouse-health" mt={8} px={{ base: 0, md: 2 }} pb={10}>
      <Flex
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={3}
        mb={4}
      >
        <Box>
          <Text fontSize="2xl" fontWeight="700">
            Warehouse Health
          </Text>
          <Text color="gray.600" fontSize="sm">
            {h ? dayText(h.date) : dayText(date)} · values at NLC · from
            RetailPilot
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          <Input
            type="date"
            size="sm"
            w="160px"
            value={date}
            max={istTodayIso()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDate(yesterdayIso())}
          >
            Yesterday
          </Button>
          <Button
            size="sm"
            colorScheme="teal"
            variant="outline"
            isLoading={sending}
            onClick={sendMe}
          >
            Send me on Telegram
          </Button>
        </Flex>
      </Flex>

      {state.loading && !h && (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      )}
      {state.error && (
        <Card borderColor="red.200" bg="red.50">
          <Text color="red.700">{state.error}</Text>
          <Button size="sm" mt={2} onClick={load}>
            Try again
          </Button>
        </Card>
      )}

      {h && (
        <Stack spacing={4} opacity={state.loading ? 0.6 : 1}>
          <ChainStatus st={h.chain_status} has={Boolean(h.stage_chain)} />
          {h.stage_chain && (
            <StageChain
              sc={h.stage_chain}
              unloading={h.tiles.unloading}
              notOnTruck={h.tiles.loading.not_on_truck}
            />
          )}
          {h.missing_reports.length > 0 && (
            <Box
              bg="gray.50"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              px={4}
              py={2}
            >
              <Text fontSize="sm" color="gray.700">
                Not pulled yet for this day: {h.missing_reports.join(", ")}
              </Text>
            </Box>
          )}

          <Box
            bg={h.need_you.length ? "red.50" : "green.50"}
            borderWidth="1px"
            borderColor={h.need_you.length ? "red.200" : "green.200"}
            borderRadius="xl"
            p={4}
          >
            <Text
              fontWeight="700"
              mb={h.need_you.length ? 2 : 0}
              color={h.need_you.length ? "red.800" : "green.800"}
            >
              {h.need_you.length
                ? `${h.need_you.length} thing${h.need_you.length === 1 ? "" : "s"} need you`
                : "All clear"}
            </Text>
            <Stack spacing={1}>
              {h.need_you.map((i) => (
                <Flex
                  key={i.text}
                  gap={2}
                  align="baseline"
                  as="button"
                  type="button"
                  textAlign="left"
                  onClick={() => setOpen(i.key)}
                >
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={TONE[i.tone].dot}
                    flexShrink={0}
                    mt="6px"
                  />
                  <Text color={TONE[i.tone].text}>{i.text}</Text>
                </Flex>
              ))}
            </Stack>
          </Box>

          <Grid
            templateColumns={{ base: "1fr 1fr", lg: "repeat(3, 1fr)" }}
            gap={3}
          >
            <Tile
              tone={h.tiles.writeoff.lines ? "red" : "green"}
              label="Picking write-off"
              value={plural(h.tiles.writeoff.lines, "line")}
              sub={[
                `${rupees(h.tiles.writeoff.value)} at NLC · ${num(h.tiles.writeoff.qty)} qty`,
                typeSplit(h.tiles.writeoff.by_job_type),
              ]
                .filter(Boolean)
                .join(" · ")}
              active={open === "writeoff"}
              onClick={() => toggle("writeoff")}
            />
          </Grid>

          <Detail open={open} h={h} />
          <Repeats rows={h.repeats} />
          <Pickers
            rows={h.pickers}
            groups={h.picker_groups}
            target={h.accuracy_target}
            from={h.month_from}
            to={h.date}
          />
        </Stack>
      )}
    </Box>
  );
}
