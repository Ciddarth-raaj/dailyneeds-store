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
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
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
  { key: "chase", label: "To chase" },
  { key: "waiting", label: "Waiting (C, under 5 days)" },
  { key: "review", label: "Slow-moving review (X)" },
  { key: "all", label: "All open" },
];

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const title = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

function UpdateModal({ line, onClose, onSaved }) {
  const [reason, setReason] = useState(line?.reason || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!line) return;
    setReason(line.reason || "");
    setNote("");
    setEvents(null);
    OosFollowupHelper.events(line.id)
      .then((b) => setEvents(b.data || []))
      .catch(() => setEvents([]));
  }, [line]);

  const save = async () => {
    const changedReason = reason && reason !== line.reason ? reason : null;
    if (!changedReason && !note.trim()) {
      toast.error("Choose a reason or write a note");
      return;
    }
    setSaving(true);
    try {
      await OosFollowupHelper.answer(line.id, { reason: changedReason, note: note.trim() || null });
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={Boolean(line)} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {line ? title(line.article_name) : ""}
          <Text fontSize="sm" fontWeight="normal" color="gray.600">
            {line ? `${title(line.store)} · ${line.supplier_name || "no supplier"} · out ${line.days_out} day(s)` : ""}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {line ? (
            <VStack align="stretch" spacing={3}>
              <Box>
                <Badge colorScheme={CAUSES[line.cause]?.color || "gray"}>{CAUSES[line.cause]?.label || line.cause}</Badge>{" "}
                <Text as="span" fontSize="sm">
                  {line.cause_detail}
                </Text>
              </Box>
              <Select size="sm" placeholder="Reason…" value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Textarea size="sm" placeholder="Note (optional) – e.g. supplier delivers Friday" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  History
                </Text>
                {events == null ? (
                  <Spinner size="sm" />
                ) : events.length ? (
                  <VStack align="stretch" spacing={1}>
                    {events.map((e) => (
                      <Text key={e.oos_case_event_id} fontSize="xs">
                        <b>{moment(e.created_at).format("DD-MM HH:mm")}</b> · {e.employee_name || "?"}
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

function Scoreboard({ rows, selected, onSelect }) {
  if (!rows || !rows.length) return null;
  return (
    <Box borderWidth="1px" borderRadius="md" overflowX="auto" mb={4} bg="white">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Buyer</Th>
            <Th isNumeric>To chase</Th>
            <Th isNumeric>Class A</Th>
            <Th isNumeric>Value to chase</Th>
            <Th isNumeric>No update</Th>
            <Th isNumeric>New today</Th>
            <Th isNumeric>Oldest (days)</Th>
            <Th isNumeric>Back in stock</Th>
            <Th isNumeric>Slow-moving</Th>
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
                <Td isNumeric>{r.class_a}</Td>
                <Td isNumeric>{rupees(r.value_to_chase)}</Td>
                <Td isNumeric color={r.not_updated ? "red.600" : undefined} fontWeight={r.not_updated ? "bold" : undefined}>
                  {r.not_updated}
                </Td>
                <Td isNumeric>{r.new_today}</Td>
                <Td isNumeric>{r.oldest_days}</Td>
                <Td isNumeric color="green.600">
                  {r.back_in_stock}
                </Td>
                <Td isNumeric>{r.review}</Td>
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
  const counts = useMemo(() => {
    const c = { chase: 0, waiting: 0, review: 0, all: cases.length };
    for (const x of cases) c[x.list] += 1;
    return c;
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

  const colDefs = useMemo(
    () => [
      {
        headerName: "Item",
        field: "article_name",
        minWidth: 260,
        cellRenderer: (p) => (
          <span>
            {title(p.data.article_name)}{" "}
            <span style={{ color: "#888", fontSize: 11 }}>{p.data.article_id}</span>
            {p.data.is_new ? (
              <Badge ml={1} colorScheme="purple" fontSize="0.6em">
                NEW
              </Badge>
            ) : null}
          </span>
        ),
      },
      { headerName: "Store", field: "store", width: 120, valueFormatter: (p) => title(p.value) },
      { headerName: "Class", field: "class", width: 80 },
      { headerName: "Days out", field: "days_out", width: 95 },
      { headerName: "Value", field: "value", width: 110, valueFormatter: (p) => rupees(p.value) },
      { headerName: "Out in", field: "stores_out", width: 85, valueFormatter: (p) => `${p.value} loc.` },
      { headerName: "Supplier", field: "supplier_name", minWidth: 200 },
      ...(canChase ? [{ headerName: "Buyer", field: "buyer_name", width: 140 }] : []),
      {
        headerName: "Likely cause",
        field: "cause",
        minWidth: 320,
        cellRenderer: (p) => (
          <span title={p.data.cause_detail || ""}>
            <Badge colorScheme={CAUSES[p.value]?.color || "gray"}>{CAUSES[p.value]?.label || p.value}</Badge>{" "}
            <span style={{ fontSize: 12 }}>{p.data.cause_detail}</span>
          </span>
        ),
      },
      {
        headerName: "Answer",
        field: "reason",
        minWidth: 220,
        cellRenderer: (p) =>
          p.data.reason || p.data.last_note ? (
            <span title={p.data.last_note || ""}>
              {p.data.reason ? <b>{REASONS[p.data.reason] || p.data.reason}</b> : null}
              {p.data.last_note ? <span style={{ fontSize: 12 }}> {`"${p.data.last_note}"`}</span> : null}
            </span>
          ) : p.data.needs_update ? (
            <Badge colorScheme="red">No update</Badge>
          ) : (
            ""
          ),
      },
      {
        headerName: "",
        field: "id",
        width: 100,
        cellRenderer: (p) => (
          <Button size="xs" colorScheme="purple" variant="outline" onClick={() => setEditing(p.data)}>
            Update
          </Button>
        ),
      },
    ],
    [canChase]
  );

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
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={onFile} />
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

        {canChase ? <Scoreboard rows={data?.scoreboard} selected={buyer} onSelect={setBuyer} /> : null}

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
          <TabList>
            {LISTS.map((l) => (
              <Tab key={l.key}>
                {l.label} ({counts[l.key] || 0})
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <AgGrid tableKey="oos-followup-lines" rowData={shown} colDefs={colDefs} getRowId={(p) => String(p.data.id)} loading={loading} />
      </CustomContainer>
      <UpdateModal
        line={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </GlobalWrapper>
  );
}
