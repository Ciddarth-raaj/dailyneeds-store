import React, { useCallback, useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../../components/CustomModal";
import offersV3Talker from "../../helper/offersV3Talker";
import usePermissions from "../../customHooks/usePermissions";
import { OFFER_TYPE_LABELS } from "../../constants/offersV3";


const STATUS_COLORS = { published: "green", ended: "red" };

/**
 * A value means nothing without its type - 10 is 10% off, Rs10 off MRP, or a
 * Rs10 price - so the two columns are read together and the unit goes here.
 */
function offerValueLabel(offer_type, value) {
  if (value == null) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const text = Number.isInteger(num) ? String(num) : num.toFixed(2);
  return offer_type === "percentage" ? `${text}%` : `₹${text}`;
}

/**
 * Add articles to this group, picked from the articles currently on offer -
 * not the whole product master. A talker advertises an offer, so an article
 * with no live offer has no sign and doesn't belong in a group.
 *
 * An article belongs to exactly one group, so adding one that already sits in
 * another group moves it - that is how "move articles between groups" works.
 */
function AddArticles({ existingCodes, disabled, busy, onAdd }) {
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    offersV3Talker.groups
      .offerArticles()
      .then((rows) => !cancelled && setPool(rows))
      .catch((err) => toast.error(err.message ?? "Could not load offer articles"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const taken = new Set(existingCodes);
    return pool
      .filter((p) => !taken.has(p.item_code))
      .filter(
        (p) =>
          String(p.item_code).includes(q) ||
          String(p.item_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [pool, search, existingCodes]);

  if (disabled) return null;

  return (
    <Box borderWidth="1px" borderRadius="md" p={3} mb={4}>
      <Text fontWeight="bold" fontSize="sm" mb={1}>
        Add articles
      </Text>
      <Text fontSize="xs" color="gray.500" mb={2}>
        Only articles currently on offer can be added — a talker advertises an
        offer. An article belongs to one group, so adding one already in
        another group moves it.
      </Text>
      <Input
        size="sm"
        placeholder={
          loading
            ? "Loading articles on offer…"
            : `Search ${pool.length} articles on offer (2+ characters)`
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        isDisabled={loading}
        mb={2}
      />
      {search.trim().length >= 2 ? (
        matches.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            {loading
              ? "Still loading…"
              : "Nothing on offer matches that. Articles with no live offer can’t be added."}
          </Text>
        ) : (
          <Box maxH="200px" overflowY="auto">
            {matches.map((p, i) => (
              <Flex
                key={p.item_code}
                px={2}
                py={1}
                bg={i % 2 ? "gray.50" : "white"}
                align="center"
                gap={2}
              >
                <Box flex="1" minW={0}>
                  <Text fontSize="sm" noOfLines={1}>
                    {p.item_code} · {p.item_name}
                  </Text>
                  {p.group_label ? (
                    <Text fontSize="xs" color="orange.600">
                      currently in “{p.group_label}” — adding moves it
                    </Text>
                  ) : null}
                </Box>
                <Button
                  size="xs"
                  colorScheme="green"
                  isDisabled={busy}
                  onClick={() => onAdd(p.item_code)}
                >
                  Add
                </Button>
              </Flex>
            ))}
          </Box>
        )
      ) : null}
    </Box>
  );
}

function GroupRow({ group, onOpen, selected, onSelect }) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={3}
      mb={2}
      cursor="pointer"
      bg={selected ? "red.50" : undefined}
      borderColor={selected ? "red.300" : undefined}
      _hover={{ borderColor: selected ? "red.400" : "blue.300" }}
      onClick={() => onOpen(group.id)}
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Checkbox
          isChecked={selected}
          /* the row opens the group, so the tick must not also open it */
          onClick={(e) => e.stopPropagation()}
          onChange={() => onSelect(group.id)}
        />
        <Box flex="1" minW={0}>
          <Text fontWeight="bold">{group.label}</Text>
          <Text fontSize="sm" color="gray.600">
            {group.item_count} article{group.item_count === 1 ? "" : "s"} ·{" "}
            {group.location_count} spot{group.location_count === 1 ? "" : "s"} mapped
            {group.supplier ? ` · ${group.supplier}` : ""}
          </Text>
        </Box>
        <Flex gap={2} align="center">
          <Badge colorScheme={group.group_type === "brand" ? "blue" : "gray"}>
            {group.group_type === "brand" ? "brand" : "individual"}
          </Badge>
          <Badge colorScheme={STATUS_COLORS[group.status]}>{group.status}</Badge>
        </Flex>
      </Flex>
    </Box>
  );
}

export default function TalkerGroups() {
  const canManage = usePermissions("manage_offers_v3_talker_groups");

  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState({ data: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  // The box filters both tabs, so it is typed into faster than a round trip.
  // Applying it on a pause keeps one request per search, not one per keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ label: "", talker_text: "", expected_pct_off: "" });
  const [splitSelection, setSplitSelection] = useState([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      offersV3Talker.groups.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { group_type: typeFilter } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
      }),
      offersV3Talker.groups.ungrouped(),
    ])
      .then(([g, u]) => {
        setGroups(g);
        setUngrouped(u);
        // A tick has to mean the row you can see. Keeping a selection across a
        // filter change would let a Delete hit groups scrolled out of view.
        setSelectedIds(new Set());
        setPickedCodes(new Set());
      })
      .catch((err) => toast.error(err.message ?? "Could not load groups"))
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, appliedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    groups.length > 0 && groups.every((g) => selectedIds.has(g.id));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(groups.map((g) => g.id)));

  /**
   * Deleting a group takes its per-outlet shelf map and every photo round with
   * it, and none of that comes back - an outlet's map only exists because staff
   * walked the aisles. So the server is asked what would go first, and the
   * confirmation names it.
   */
  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDeleting(true);
    try {
      const { counts } = await offersV3Talker.groups.deletePreview(ids);
      const alsoGoes = [
        counts.locations
          ? `${counts.locations} mapped shelf spot${counts.locations === 1 ? "" : "s"}`
          : null,
        counts.proofs
          ? `${counts.proofs} photo round${counts.proofs === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean);

      const message =
        `Delete ${counts.groups} sign${counts.groups === 1 ? "" : "s"}?` +
        (alsoGoes.length
          ? `\n\nThis also permanently deletes ${alsoGoes.join(" and ")}. ` +
            `A store's shelf map cannot be rebuilt except by staff walking the aisles again.`
          : "") +
        `\n\nThe offers themselves are not touched.` +
        `\n\nThis cannot be undone.`;

      if (!window.confirm(message)) return;

      const res = await offersV3Talker.groups.bulkDelete(ids);
      toast.success(
        `Deleted ${res.deleted} sign${res.deleted === 1 ? "" : "s"}`
      );
      setSelectedIds(new Set());
      fetchAll();
    } catch (err) {
      toast.error(err.message ?? "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const data = await offersV3Talker.groups.getById(id);
      setDetail(data);
      setSplitSelection([]);
      setDetailOpen(true);
    } catch (err) {
      toast.error(err.message ?? "Could not load group");
    }
  };

  const refreshDetail = async () => {
    if (detail) {
      try {
        const data = await offersV3Talker.groups.getById(detail.id);
        setDetail(data);
      } catch (err) {
        // Deleted, or merged away into another group - close rather than
        // reporting the now-missing group as a failure.
        setDetail(null);
        setDetailOpen(false);
      }
    }
    fetchAll();
  };

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      await refreshDetail();
    } catch (err) {
      toast.error(err.message ?? "That didn’t work");
    } finally {
      setBusy(false);
    }
  };

  /**
   * A single article that didn't cluster still needs a sign - it just isn't
   * auto-grouped any more. This makes one for it in a click and opens it, so
   * it doesn't mean building a group by hand every time.
   */
  const [pickedCodes, setPickedCodes] = useState(() => new Set());

  /**
   * The same box filters this tab, client side: the whole pool is already
   * loaded, and an article is looked for by code as often as by name.
   */
  const visibleUngrouped = useMemo(() => {
    if (!appliedSearch) return ungrouped.data;
    const q = appliedSearch.toLowerCase();
    return ungrouped.data.filter((r) =>
      [r.item_code, r.item_name, r.supplier].some(
        (field) => field != null && String(field).toLowerCase().includes(q)
      )
    );
  }, [ungrouped.data, appliedSearch]);

  const togglePick = (code) =>
    setPickedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  /**
   * Two intents over the same selection, so the caller says which rather than
   * the count deciding: five ticked articles could mean five individual cards
   * or one card covering all five.
   */
  const createTalkers = async (mode) => {
    const codes = [...pickedCodes];
    if (!codes.length) return;
    setBusy(true);
    try {
      const res = await offersV3Talker.groups.bulkCreate(codes, mode);
      toast.success(
        mode === "individual"
          ? `${res.created} individual talker${res.created === 1 ? "" : "s"} created`
          : "Group talker created"
      );
      setPickedCodes(new Set());
      await fetchAll();
      if (mode === "group" && res.ids?.[0]) openDetail(res.ids[0]);
    } catch (err) {
      toast.error(err.message ?? "Could not create talkers");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newGroup.label.trim()) {
      toast.error("Give the talker a name");
      return;
    }
    setBusy(true);
    try {
      await offersV3Talker.groups.create({
        label: newGroup.label.trim(),
        talker_text: newGroup.talker_text || null,
        expected_pct_off: newGroup.expected_pct_off
          ? Number(newGroup.expected_pct_off)
          : null,
      });
      toast.success("Talker created");
      setCreateOpen(false);
      setNewGroup({ label: "", talker_text: "", expected_pct_off: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.message ?? "Could not create the talker");
    } finally {
      setBusy(false);
    }
  };

  const publishedGroups = useMemo(
    () => groups.filter((g) => g.status === "published" && g.id !== detail?.id),
    [groups, detail]
  );

  return (
    <GlobalWrapper title="Talker Groups" permissionKey="manage_offers_v3_talker_groups">
      <CustomContainer title="Talker Groups" filledHeader>
        <Box p={4}>
          <Text fontSize="sm" color="gray.600" mb={4}>
            One group is one physical sign. Nothing reaches an outlet’s list
            until it’s published.
          </Text>

          <Flex gap={2} mb={4} wrap="wrap">
            <Input
              size="sm"
              placeholder="Search name, supplier or item code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxW="260px"
            />
            <Select
              size="sm"
              maxW="160px"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Live & ended</option>
              <option value="published">Live</option>
              <option value="ended">Ended</option>
            </Select>
            <Select
              size="sm"
              maxW="190px"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Brand &amp; individual</option>
              <option value="group">Group talkers only</option>
              <option value="individual">Individual talkers only</option>
            </Select>
            {canManage ? (
              <>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  New talker
                </Button>
              </>
            ) : null}
          </Flex>

          <Tabs colorScheme="purple">
            <TabList>
              <Tab>Groups ({groups.length})</Tab>
              <Tab>
                {/* Not an alert: an article on offer is individual by default
                    and needs no sign, so this is a pool to pick from. */}
                Not in a group{" "}
                {ungrouped.count > 0 ? (
                  <Badge ml={2} colorScheme="gray">
                    {ungrouped.count}
                  </Badge>
                ) : null}
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0}>
                {canManage && groups.length ? (
                  <Flex
                    gap={3}
                    align="center"
                    mb={3}
                    wrap="wrap"
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={selectedIds.size ? "red.50" : "gray.50"}
                  >
                    <Checkbox isChecked={allSelected} onChange={toggleSelectAll}>
                      Select all ({groups.length})
                    </Checkbox>
                    <Text fontSize="sm" color="gray.600" flex="1">
                      {selectedIds.size
                        ? `${selectedIds.size} selected`
                        : "Tick signs to delete them"}
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="red"
                      isDisabled={!selectedIds.size}
                      isLoading={deleting}
                      onClick={deleteSelected}
                    >
                      Delete selected
                    </Button>
                  </Flex>
                ) : null}
                {loading ? (
                  <Flex justify="center" p={8}>
                    <Spinner />
                  </Flex>
                ) : groups.length === 0 ? (
                  <Text p={6} textAlign="center" color="gray.600">
                    No talkers yet. Pick articles on offer and create one
                    from the live offers.
                  </Text>
                ) : (
                  groups.map((g) => (
                    <GroupRow
                      key={g.id}
                      group={g}
                      onOpen={openDetail}
                      selected={selectedIds.has(g.id)}
                      onSelect={toggleSelect}
                    />
                  ))
                )}
              </TabPanel>

              <TabPanel px={0}>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Articles on offer with no talker. They need one only where
                  you want one — tick what you want a card for.
                </Text>
                {canManage && visibleUngrouped.length ? (
                  <Flex
                    gap={3}
                    align="center"
                    wrap="wrap"
                    mb={3}
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={pickedCodes.size ? "purple.50" : "gray.50"}
                  >
                    <Text fontSize="sm" flex="1">
                      {pickedCodes.size
                        ? `${pickedCodes.size} article${pickedCodes.size === 1 ? "" : "s"} selected`
                        : "Nothing selected"}
                    </Text>
                    <Button
                      size="sm"
                      isDisabled={!pickedCodes.size || busy}
                      onClick={() => createTalkers("individual")}
                    >
                      Individual talkers ({pickedCodes.size})
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      isDisabled={pickedCodes.size < 2 || busy}
                      onClick={() => createTalkers("group")}
                    >
                      One group talker
                    </Button>
                  </Flex>
                ) : null}
                {ungrouped.data.length === 0 ? (
                  <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                    <Text>Every article on offer already has a talker.</Text>
                  </Box>
                ) : visibleUngrouped.length === 0 ? (
                  <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                    <Text>
                      No article on offer matches “{appliedSearch}”.
                    </Text>
                  </Box>
                ) : (
                  <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
                    <Table size="sm">
                      <Thead bg="gray.50">
                        <Tr>
                          {canManage ? <Th w="1%" /> : null}
                          <Th>Item Code</Th>
                          <Th>Item Name</Th>
                          <Th>Supplier</Th>
                          <Th>Offer Type</Th>
                          <Th isNumeric>Value</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {visibleUngrouped.slice(0, 200).map((row) => (
                          <Tr key={row.item_code}>
                            {canManage ? (
                              <Td>
                                <Checkbox
                                  isChecked={pickedCodes.has(row.item_code)}
                                  onChange={() => togglePick(row.item_code)}
                                />
                              </Td>
                            ) : null}
                            <Td>{row.item_code}</Td>
                            <Td>{row.item_name}</Td>
                            <Td color="gray.600">{row.supplier ?? "—"}</Td>
                            <Td>
                              {OFFER_TYPE_LABELS[row.offer_type] ?? row.offer_type}
                            </Td>
                            <Td isNumeric>
                              {offerValueLabel(row.offer_type, row.value)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {visibleUngrouped.length > 200 ? (
                      <Text p={2} fontSize="xs" color="gray.500">
                        Showing the first 200 of {visibleUngrouped.length} —
                        search to narrow it down.
                      </Text>
                    ) : null}
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </CustomContainer>

      {/* Create */}
      <CustomModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New talker group"
        footer={
          <Flex gap={2}>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreate} isLoading={busy}>
              Create talker
            </Button>
          </Flex>
        }
      >
        <Box>
          <Text fontSize="sm" mb={1}>
            Name (what staff will read)
          </Text>
          <Input
            mb={3}
            placeholder="e.g. Cadbury — 22% off"
            value={newGroup.label}
            onChange={(e) => setNewGroup({ ...newGroup, label: e.target.value })}
          />
          <Text fontSize="sm" mb={1}>
            Text expected on the sign
          </Text>
          <Input
            mb={3}
            placeholder="e.g. 22% OFF"
            value={newGroup.talker_text}
            onChange={(e) => setNewGroup({ ...newGroup, talker_text: e.target.value })}
          />
          <Text fontSize="sm" mb={1}>
            Expected % off (optional)
          </Text>
          <Input
            type="number"
            value={newGroup.expected_pct_off}
            onChange={(e) =>
              setNewGroup({ ...newGroup, expected_pct_off: e.target.value })
            }
          />
        </Box>
      </CustomModal>

      {/* Detail */}
      <CustomModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.label ?? "Group"}
        size="3xl"
      >
        {detail ? (
          <Box>
            <Flex gap={2} mb={4} wrap="wrap" align="center">
              <Badge colorScheme={STATUS_COLORS[detail.status]}>{detail.status}</Badge>
              <Text fontSize="sm" color="gray.600">
                {detail.items.length} articles · {detail.locations.length} spots
              </Text>
            </Flex>

            {detail.status === "ended" ? (
              <Box bg="gray.100" p={3} borderRadius="md" mb={4}>
                <Text fontSize="sm">
                  This group has ended and is frozen — its articles can’t change,
                  so past photos stay meaningful.
                </Text>
              </Box>
            ) : null}

            {canManage && detail.status !== "ended" ? (
              <Box mb={4}>
                <Text fontSize="sm" mb={1}>
                  Name
                </Text>
                <Input
                  size="sm"
                  mb={2}
                  defaultValue={detail.label}
                  onBlur={(e) =>
                    e.target.value !== detail.label &&
                    act(
                      () => offersV3Talker.groups.update(detail.id, { label: e.target.value }),
                      "Name updated — no re-shoot needed"
                    )
                  }
                />
                <Text fontSize="sm" mb={1}>
                  Text expected on the sign
                </Text>
                <Textarea
                  size="sm"
                  mb={2}
                  defaultValue={detail.talker_text ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (detail.talker_text ?? "") &&
                    act(
                      () =>
                        offersV3Talker.groups.update(detail.id, {
                          talker_text: e.target.value,
                        }),
                      "Sign text updated — no re-shoot needed"
                    )
                  }
                />
                <Text fontSize="xs" color="gray.500">
                  Changing the name or sign text doesn’t trigger re-shoots.
                  Changing which articles are in the group does.
                </Text>
              </Box>
            ) : null}

            <AddArticles
              existingCodes={detail.items.map((i) => i.item_code)}
              disabled={!canManage || detail.status === "ended"}
              busy={busy}
              onAdd={(itemCode) =>
                act(
                  () =>
                    offersV3Talker.groups.setItems(detail.id, {
                      add: [itemCode],
                    }),
                  detail.status === "published"
                    ? "Added — this group’s spots will be re-shot once"
                    : "Added"
                )
              }
            />

            <Text fontWeight="bold" fontSize="sm" mb={2}>
              Articles ({detail.items.length})
            </Text>
            <Box maxH="220px" overflowY="auto" borderWidth="1px" borderRadius="md" mb={4}>
              {detail.items.map((item, i) => (
                <Flex key={item.item_code} px={3} py={1} bg={i % 2 ? "gray.50" : "white"} align="center" gap={2}>
                  {canManage && detail.status !== "ended" ? (
                    <Checkbox
                      isChecked={splitSelection.includes(item.item_code)}
                      onChange={(e) =>
                        setSplitSelection((prev) =>
                          e.target.checked
                            ? [...prev, item.item_code]
                            : prev.filter((c) => c !== item.item_code)
                        )
                      }
                    />
                  ) : null}
                  <Text fontSize="sm" flex="1">
                    {item.item_code} · {item.item_name}
                  </Text>
                  {canManage && detail.status !== "ended" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      isDisabled={busy}
                      onClick={() =>
                        act(
                          () =>
                            offersV3Talker.groups.setItems(detail.id, {
                              remove: [item.item_code],
                            }),
                          "Removed — this group’s spots will be re-shot once"
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </Flex>
              ))}
              {detail.items.length === 0 ? (
                <Text p={3} fontSize="sm" color="gray.500">
                  No articles yet.
                </Text>
              ) : null}
            </Box>

            {canManage && detail.status !== "ended" && splitSelection.length > 0 ? (
              <Button
                size="sm"
                mb={4}
                isDisabled={busy}
                onClick={() =>
                  act(
                    () =>
                      offersV3Talker.groups.split(detail.id, {
                        item_codes: splitSelection,
                      }),
                    `Split ${splitSelection.length} article(s) into a new group`
                  )
                }
              >
                Split {splitSelection.length} selected into a new group
              </Button>
            ) : null}

            <Text fontWeight="bold" fontSize="sm" mb={2}>
              Spots by outlet
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} mb={4}>
              {detail.locations.map((loc) => (
                <Box key={loc.id} borderWidth="1px" borderRadius="md" p={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    {loc.outlet_name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {loc.label}
                    {!loc.active ? " (gone)" : ""}
                  </Text>
                </Box>
              ))}
              {detail.locations.length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  None mapped yet — outlet staff add these as they find them.
                </Text>
              ) : null}
            </SimpleGrid>

            {canManage ? (
              <Flex gap={2} wrap="wrap" pt={2} borderTopWidth="1px">
                {detail.status === "published" ? (
                  <>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      isDisabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete “${detail.label}”? Its articles go back to being individual, with no sign.`
                          )
                        ) {
                          return;
                        }
                        act(async () => {
                          await offersV3Talker.groups.remove(detail.id);
                          setDetailOpen(false);
                        }, "Deleted");
                      }}
                    >
                      Delete talker
                    </Button>
                  </>
                ) : null}
                {detail.status === "published" ? (
                  <>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      isDisabled={busy}
                      onClick={() =>
                        act(() => offersV3Talker.groups.end(detail.id), "Ended")
                      }
                    >
                      End (offer is over)
                    </Button>
                    <Button
                      size="sm"
                      isDisabled={busy}
                      onClick={() =>
                        act(
                          () => offersV3Talker.pushToQueue(detail.id, null),
                          "Pushed to the top of every outlet’s list"
                        )
                      }
                    >
                      Ask all outlets to re-shoot
                    </Button>
                  </>
                ) : null}
                {detail.status !== "ended" && publishedGroups.length ? (
                  <Flex gap={1} align="center">
                    <Select
                      size="sm"
                      maxW="200px"
                      placeholder="Merge into…"
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                    >
                      {publishedGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      isDisabled={!mergeTarget || busy}
                      onClick={() =>
                        act(async () => {
                          await offersV3Talker.groups.merge(
                            detail.id,
                            Number(mergeTarget)
                          );
                          setDetailOpen(false);
                        }, "Merged")
                      }
                    >
                      Merge
                    </Button>
                  </Flex>
                ) : null}
              </Flex>
            ) : null}
          </Box>
        ) : (
          <Spinner />
        )}
      </CustomModal>
    </GlobalWrapper>
  );
}
