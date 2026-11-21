import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
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
import {
  BOX_STATUS,
  yesterdayIso,
  istTodayIso,
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
      </Card>
    );
  }
  if (open === "boxes") {
    const list = t.boxes.list || [];
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={1}>
          Boxes
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          <b>Not on a truck</b>: on the loading list, never put on a truck
          (still at the warehouse). <b>Not delivered</b>: on a truck, but not
          unloaded, unloaded at the wrong store, or the quantity differs.
        </Text>
        {!list.length && (
          <Text color="gray.500">Every box reached its store.</Text>
        )}
        {list.length > 0 && (
          <SimpleTable
            head={[
              "Box",
              "Problem",
              "Store",
              "Truck",
              "Articles",
              "Qty",
              "Value",
            ]}
            rows={list.map((b) => [
              b.box_id,
              <Badge
                key="s"
                colorScheme={(BOX_STATUS[b.status] || {}).color || "gray"}
              >
                {(BOX_STATUS[b.status] || {}).label || b.status}
              </Badge>,
              title(b.store) +
                (b.status === "WRONG_STORE" && b.unloaded_store
                  ? ` → ${title(b.unloaded_store)}`
                  : ""),
              b.truck_no || "—",
              b.articles,
              b.qty,
              rupees(b.value),
            ])}
          />
        )}
      </Card>
    );
  }
  if (open === "remarks") {
    const r = t.remarks;
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={3}>
          Remarks pending
        </Text>
        <SimpleTable
          head={[
            "Page",
            "Lines that day",
            "Without remark",
            "Older, still without (30 days)",
          ]}
          rows={[
            [
              <Link key="w" href="/pick-pack/write-off">
                <a>Write Off</a>
              </Link>,
              r.write_off.total,
              r.write_off.pending,
              r.write_off.backlog,
            ],
            [
              <Link key="v" href="/pick-pack/verification">
                <a>Verification</a>
              </Link>,
              r.verification.total,
              r.verification.pending,
              r.verification.backlog,
            ],
          ]}
        />
      </Card>
    );
  }
  if (open === "jobs") {
    return (
      <Card>
        <Text fontWeight="700" fontSize="lg" mb={3}>
          Jobs not finished
        </Text>
        <Text fontSize="sm" mb={3}>
          Picking {plural(t.jobs.picking_open, "line")} open · Packing{" "}
          {plural(t.jobs.packing_open, "line")} open · Verification{" "}
          {plural(t.jobs.verification_open, "line")} open
        </Text>
        {t.jobs.by_store.length > 0 && (
          <SimpleTable
            head={["Store", "Open lines"]}
            rows={t.jobs.by_store.map((s) => [s.name, s.open_lines])}
          />
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

function Flow({ f }) {
  const steps = [
    {
      label: "Picked",
      main: plural(f.picked_lines, "line"),
      sub: `${rupees(f.picked_value)} · ${num(f.picking_short_lines)} short`,
    },
    {
      label: "Packed",
      main: plural(f.packed_lines, "line"),
      sub: `${num(f.packing_short_lines)} short`,
    },
    {
      label: "Loading list",
      main: plural(f.loading_list_boxes, "box", "boxes"),
      sub: `${num(f.on_truck_boxes)} on ${plural(f.trucks, "truck")}`,
    },
    {
      label: "Unloaded",
      main: plural(f.unloaded_boxes, "box", "boxes"),
      sub: "at stores",
    },
    {
      label: "Verified",
      main: plural(f.verified_lines, "line"),
      sub: `${num(f.verification_short_lines)} short`,
    },
  ];
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={3}>
        Flow of goods
      </Text>
      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
        {steps.map((s, i) => (
          <Box key={s.label} bg="gray.50" borderRadius="lg" p={3}>
            <Text
              fontSize="xs"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              {i + 1}. {s.label}
            </Text>
            <Text fontWeight="700">{s.main}</Text>
            <Text fontSize="sm" color="gray.600">
              {s.sub}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Card>
  );
}

function Stores({ stores }) {
  const shown = stores.filter((s) => s.store !== "warehouse" || s.needs_look);
  if (!shown.length) return null;
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={3}>
        Stores
      </Text>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={3}>
        {shown.map((s) => (
          <Box
            key={s.store}
            borderWidth="1px"
            borderColor={s.needs_look ? "red.200" : "gray.200"}
            bg={s.needs_look ? "red.50" : "white"}
            borderRadius="lg"
            p={3}
          >
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontWeight="700">{s.name}</Text>
              {s.needs_look ? (
                <Badge colorScheme="red">Look</Badge>
              ) : (
                <Badge colorScheme="green">OK</Badge>
              )}
            </Flex>
            {s.picking_short_lines > 0 && (
              <Text fontSize="sm">
                Picking write-off: {plural(s.picking_short_lines, "line")} ·{" "}
                {rupees(s.picking_short_value)}
              </Text>
            )}
            {typeSplit(s.picking_by_type) && (
              <Text fontSize="xs" color="gray.500">
                {typeSplit(s.picking_by_type)}
              </Text>
            )}
            {s.verification_short_qty > 0 && (
              <Text fontSize="sm">
                Found short at verification: {num(s.verification_short_qty)} qty
              </Text>
            )}
            {s.yet_to_verify_qty > 0 && (
              <Text fontSize="sm">
                Yet to verify: {num(s.yet_to_verify_qty)} qty
              </Text>
            )}
            {s.box_issues > 0 && (
              <Text fontSize="sm">Box problems: {num(s.box_issues)}</Text>
            )}
            {s.open_lines > 0 && (
              <Text fontSize="sm" color="gray.600">
                Open lines: {num(s.open_lines)}
              </Text>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Card>
  );
}

function Trend({ rows }) {
  const max = Math.max(0, ...rows.map((r) => r.short_lines));
  return (
    <Card>
      <Text fontWeight="700" fontSize="lg" mb={1}>
        Picking write-off, last 7 days
      </Text>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Lines short each day
      </Text>
      <Flex align="flex-end" gap={2} h="120px">
        {rows.map((r) => (
          <Flex
            key={r.date}
            direction="column"
            align="center"
            justify="flex-end"
            flex="1"
            h="100%"
            title={`${dayText(r.date)}: ${r.short_lines} lines · ${rupees(r.short_value)}`}
          >
            <Text fontSize="xs" fontWeight="600">
              {r.has_report ? num(r.short_lines) : "—"}
            </Text>
            <Box
              w="100%"
              maxW="36px"
              bg={r.has_report ? "red.400" : "gray.200"}
              borderRadius="md"
              h={`${max > 0 && r.has_report ? Math.max(4, (r.short_lines / max) * 90) : 4}px`}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              {dayText(r.date).split(",")[0]}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
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

function Pickers({ rows, target, from, to }) {
  const [openId, setOpenId] = useState(null);
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
      {!rows.length && (
        <Text color="gray.500">
          No picking recorded with a picker this month.
        </Text>
      )}
      {rows.length > 0 && (
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
                      p.mistakes.length &&
                      setOpenId(openId === p.id ? null : p.id)
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
                            {m.article_name || m.article_id} ·{" "}
                            {num(m.short_qty)} short · {rupees(m.value)}
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
            templateColumns={{ base: "1fr 1fr", lg: "repeat(5, 1fr)" }}
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
            {(() => {
              const b = h.tiles.boxes;
              const notDelivered = b.not_unloaded + b.wrong_store + b.qty_diff;
              const total = b.not_on_truck + notDelivered;
              return (
                <Tile
                  tone={total ? "red" : "green"}
                  label="Box problems"
                  value={num(total)}
                  sub={
                    total
                      ? `${num(b.not_on_truck)} not on a truck · ${num(notDelivered)} not delivered`
                      : "All boxes reached"
                  }
                  active={open === "boxes"}
                  onClick={() => toggle("boxes")}
                />
              );
            })()}
            <Tile
              tone={
                h.tiles.verification.short_lines
                  ? "red"
                  : h.tiles.verification.yet_to_verify_qty
                    ? "amber"
                    : "green"
              }
              label="Verification"
              value={plural(h.tiles.verification.short_lines, "line")}
              sub={`short · ${num(h.tiles.verification.yet_to_verify_qty)} qty yet to verify`}
              active={open === "verification"}
              onClick={() => toggle("verification")}
            />
            {(() => {
              const r = h.tiles.remarks;
              const pending = r.write_off.pending + r.verification.pending;
              return (
                <Tile
                  tone={
                    pending
                      ? r.write_off.backlog + r.verification.backlog
                        ? "red"
                        : "amber"
                      : "green"
                  }
                  label="Remarks pending"
                  value={num(pending)}
                  sub={`Write Off ${num(r.write_off.pending)} · Verification ${num(r.verification.pending)}`}
                  active={open === "remarks"}
                  onClick={() => toggle("remarks")}
                />
              );
            })()}
            <Tile
              tone={
                h.tiles.jobs.picking_open + h.tiles.jobs.packing_open
                  ? "amber"
                  : "green"
              }
              label="Jobs not finished"
              value={num(h.tiles.jobs.picking_open + h.tiles.jobs.packing_open)}
              sub={`picking ${num(h.tiles.jobs.picking_open)} · packing ${num(h.tiles.jobs.packing_open)} lines open`}
              active={open === "jobs"}
              onClick={() => toggle("jobs")}
            />
          </Grid>

          <Detail open={open} h={h} />
          <Flow f={h.flow} />
          <Stores stores={h.stores} />
          <Repeats rows={h.repeats} />
          <Trend rows={h.trend} />
          <Pickers
            rows={h.pickers}
            target={h.accuracy_target}
            from={h.month_from}
            to={h.date}
          />
        </Stack>
      )}
    </Box>
  );
}
