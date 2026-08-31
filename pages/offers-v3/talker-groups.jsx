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
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../../components/CustomModal";
import offersV3Talker from "../../helper/offersV3Talker";
import usePermissions from "../../customHooks/usePermissions";
import { OFFER_TYPE_LABELS } from "../../constants/offersV3";


const STATUS_COLORS = { draft: "gray", published: "green", ended: "red" };

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

function GroupRow({ group, onOpen }) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={3}
      mb={2}
      cursor="pointer"
      _hover={{ borderColor: "blue.300" }}
      onClick={() => onOpen(group.id)}
    >
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box flex="1" minW={0}>
          <Text fontWeight="bold">{group.label}</Text>
          <Text fontSize="sm" color="gray.600">
            {group.item_count} article{group.item_count === 1 ? "" : "s"} ·{" "}
            {group.location_count} spot{group.location_count === 1 ? "" : "s"} mapped
            {group.supplier ? ` · ${group.supplier}` : ""}
          </Text>
        </Box>
        <Flex gap={2} align="center">
          {group.suggested_count > 0 ? (
            <Badge colorScheme="purple">{group.suggested_count} suggested</Badge>
          ) : null}
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

  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ label: "", talker_text: "", expected_pct_off: "" });
  const [splitSelection, setSplitSelection] = useState([]);
  const [mergeTarget, setMergeTarget] = useState("");

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      offersV3Talker.groups.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { group_type: typeFilter } : {}),
        ...(search ? { search } : {}),
      }),
      offersV3Talker.groups.ungrouped(),
    ])
      .then(([g, u]) => {
        setGroups(g);
        setUngrouped(u);
      })
      .catch((err) => toast.error(err.message ?? "Could not load groups"))
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
  const makeSignForArticle = async (row) => {
    setBusy(true);
    try {
      const res = await offersV3Talker.groups.create({
        label: row.item_name || `Item ${row.item_code}`,
        group_type: "individual",
        item_codes: [row.item_code],
      });
      toast.success("Draft created — set the sign text, then publish");
      await fetchAll();
      if (res?.id) {
        openDetail(res.id);
      }
    } catch (err) {
      toast.error(err.message ?? "Could not create the sign");
    } finally {
      setBusy(false);
    }
  };

  const handleAutoDerive = async () => {
    setBusy(true);
    try {
      const res = await offersV3Talker.groups.autoDerive();
      toast.success(
        `${res.createdBrandGroups} brand sign(s) and ${res.createdIndividualGroups} individual sign(s) drafted` +
          (res.suggested ? `, ${res.suggested} suggestion(s) raised` : "")
      );
      fetchAll();
    } catch (err) {
      toast.error(err.message ?? "Auto-grouping failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newGroup.label.trim()) {
      toast.error("Give the group a name");
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
      toast.success("Group created as a draft");
      setCreateOpen(false);
      setNewGroup({ label: "", talker_text: "", expected_pct_off: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.message ?? "Could not create the group");
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
              placeholder="Search name or supplier"
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
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="ended">Ended</option>
            </Select>
            <Select
              size="sm"
              maxW="190px"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Brand &amp; individual</option>
              <option value="brand">Brand signs only</option>
              <option value="individual">Individual signs only</option>
            </Select>
            {canManage ? (
              <>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  New group
                </Button>
                <Button size="sm" colorScheme="purple" onClick={handleAutoDerive} isLoading={busy}>
                  Auto-group from offers
                </Button>
              </>
            ) : null}
          </Flex>

          <Tabs colorScheme="purple">
            <TabList>
              <Tab>Groups ({groups.length})</Tab>
              <Tab>
                Ungrouped{" "}
                {ungrouped.count > 0 ? (
                  <Badge ml={2} colorScheme="red">
                    {ungrouped.count}
                  </Badge>
                ) : null}
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0}>
                {loading ? (
                  <Flex justify="center" p={8}>
                    <Spinner />
                  </Flex>
                ) : groups.length === 0 ? (
                  <Text p={6} textAlign="center" color="gray.600">
                    No groups yet. Run “Auto-group from offers” to draft them
                    from the live offers.
                  </Text>
                ) : (
                  groups.map((g) => <GroupRow key={g.id} group={g} onOpen={openDetail} />)
                )}
              </TabPanel>

              <TabPanel px={0}>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Live offer articles with no published sign covering them —
                  these would go unchecked.
                </Text>
                {ungrouped.data.length === 0 ? (
                  <Box p={6} textAlign="center" bg="green.50" borderRadius="lg">
                    <Text>Every live offer article is covered.</Text>
                  </Box>
                ) : (
                  <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                    {ungrouped.data.slice(0, 200).map((row, i) => (
                      <Flex
                        key={row.item_code}
                        px={3}
                        py={2}
                        bg={i % 2 ? "gray.50" : "white"}
                        justify="space-between"
                        align="center"
                        gap={3}
                      >
                        <Text fontSize="sm" flex="1" noOfLines={1}>
                          {row.item_code} · {row.item_name}
                        </Text>
                        <Text fontSize="sm" color="gray.600" flexShrink={0}>
                          {OFFER_TYPE_LABELS[row.offer_type] ?? row.offer_type}
                          {row.value != null ? ` ${row.value}` : ""}
                        </Text>
                        {canManage ? (
                          <Button
                            size="xs"
                            flexShrink={0}
                            isDisabled={busy}
                            onClick={() => makeSignForArticle(row)}
                          >
                            Make a sign
                          </Button>
                        ) : null}
                      </Flex>
                    ))}
                    {ungrouped.data.length > 200 ? (
                      <Text p={2} fontSize="xs" color="gray.500">
                        Showing the first 200 of {ungrouped.data.length}.
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
              Create draft
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

            {detail.suggested?.length ? (
              <Box borderWidth="1px" borderColor="purple.200" bg="purple.50" borderRadius="md" p={3} mb={4}>
                <Text fontWeight="bold" fontSize="sm" mb={2}>
                  Suggested additions ({detail.suggested.length})
                </Text>
                <Text fontSize="xs" color="gray.600" mb={2}>
                  New articles matching this group’s supplier and markdown.
                  They’re never added on their own.
                </Text>
                {detail.suggested.map((s) => (
                  <Flex key={s.id} justify="space-between" align="center" py={1} gap={2}>
                    <Text fontSize="sm">
                      {s.item_code} · {s.item_name}
                    </Text>
                    <Flex gap={1}>
                      <Button
                        size="xs"
                        colorScheme="green"
                        isDisabled={busy}
                        onClick={() =>
                          act(
                            () => offersV3Talker.suggested.resolve(s.id, true),
                            "Added"
                          )
                        }
                      >
                        Add
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        isDisabled={busy}
                        onClick={() =>
                          act(
                            () => offersV3Talker.suggested.resolve(s.id, false),
                            "Dismissed"
                          )
                        }
                      >
                        No
                      </Button>
                    </Flex>
                  </Flex>
                ))}
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
                {detail.status === "draft" ? (
                  <>
                    <Button
                      size="sm"
                      colorScheme="green"
                      isDisabled={busy}
                      onClick={() =>
                        act(() => offersV3Talker.groups.publish(detail.id), "Published")
                      }
                    >
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      isDisabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete “${detail.label}”? Its articles go back to Ungrouped.`
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
                      Delete draft
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
