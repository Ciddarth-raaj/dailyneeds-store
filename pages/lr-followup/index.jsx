import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  Input,
  Select,
  Spinner,
  Text,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";
import Table from "../../components/table/table";
import SearchableDropdown from "../../components/customInput/SearchableDropdown";
import usePermissions from "../../customHooks/usePermissions";
import { useDistributors } from "../../customHooks/useDistributors";
import currencyFormatter from "../../util/currencyFormatter";
import { getLrFollowupSummary, getLrFollowups } from "../../helper/lrFollowup";
import {
  AGEING_BUCKETS,
  PERMISSIONS,
  SOURCE_META,
  STATUS_META,
  CLOSED_OUTCOME_FILTERS,
  ageingLabel,
  followupRef,
  outcomeMeta,
  statusFilterParams,
  formatDate,
  formatDateTime,
  sourceHref,
  sourceRef,
  transporterLabel,
} from "../../util/lrFollowup";

const HEADINGS = {
  ref: "Follow-up Ref",
  source: "Source",
  supplier: "Supplier",
  kind: "Advance / Manual",
  amount: "Amount",
  source_date: "Paid / Created Date",
  lr_no: "LR No.",
  transporter: "Transporter",
  dispatch_date: "Dispatch Date",
  expected: "Expected Delivery",
  status: "Status",
  ageing: "Ageing",
  last_follow_up: "Last Follow-up",
  next_follow_up: "Next Follow-up",
  action: "Action",
};

const EMPTY_FILTERS = {
  status: "OPEN",
  source_type: "",
  distributor_code: null,
  from_date: "",
  to_date: "",
  ageing: "",
  overdue_only: false,
};

/** "LR Follow-up" - everything paid for or dispatched on credit that has not arrived. */
function LrFollowupDashboard() {
  const router = useRouter();
  const canManage = usePermissions([PERMISSIONS.MANAGE_LEGACY]);
  const canCreate = usePermissions([PERMISSIONS.CREATE_MANUAL]);
  const { distributors } = useDistributors();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ items: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const suppliers = useMemo(
    () =>
      (distributors || [])
        .filter((d) => d.HQ_DIST_CODE != null)
        .map((d) => ({ id: d.HQ_DIST_CODE, value: d.MDM_DIST_NAME || String(d.HQ_DIST_CODE) })),
    [distributors]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list] = await Promise.all([
        getLrFollowupSummary(),
        getLrFollowups({
          ...filters,
          ...statusFilterParams(filters.status),
          distributor_code: filters.distributor_code || "",
          limit: 200,
        }),
      ]);
      if (!s || s.code !== 200) throw new Error((s && (s.detail || s.msg)) || "Could not load the summary");
      if (!list || list.code !== 200) throw new Error((list && (list.detail || list.msg)) || "Could not load follow-ups");
      setSummary(s.data);
      setData(list.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const rows = useMemo(
    () =>
      (data.items || []).map((f) => {
        // A closed row shows HOW it closed: received vs. refunded/adjusted/cancelled.
        const meta = outcomeMeta(f);
        const href = sourceHref(f);
        return {
          ref: (
            <Link href={`/lr-followup/${f.lr_followup_id}`}>
              <a style={{ color: "#6b46c1", fontWeight: 600, whiteSpace: "nowrap" }}>{followupRef(f)}</a>
            </Link>
          ),
          source: href ? (
            <Link href={href}>
              <a style={{ color: "#6b46c1", whiteSpace: "nowrap" }}>{sourceRef(f)}</a>
            </Link>
          ) : (
            sourceRef(f)
          ),
          supplier: f.supplier_name || "-",
          kind: (
            <Badge colorScheme={(SOURCE_META[f.source_type] || {}).colorScheme}>
              {(SOURCE_META[f.source_type] || {}).label || f.source_type}
            </Badge>
          ),
          // A manual follow-up carries no amount.
          amount: <NoWrap>{f.amount === null || f.amount === undefined ? "-" : currencyFormatter(f.amount)}</NoWrap>,
          source_date: <NoWrap>{formatDate(f.source_date)}</NoWrap>,
          lr_no: f.lr_no || "-",
          transporter: transporterLabel(f),
          dispatch_date: <NoWrap>{formatDate(f.dispatch_date)}</NoWrap>,
          expected: (
            <Text as="span" color={f.is_overdue ? "red.600" : undefined} fontWeight={f.is_overdue ? 600 : 400}>
              <NoWrap>{formatDate(f.expected_delivery_date)}</NoWrap>
              {f.is_overdue ? (
                <Text as="span" display="block" fontSize="xs" whiteSpace="nowrap">
                  {f.days_overdue}d overdue
                </Text>
              ) : null}
            </Text>
          ),
          status: (
            <Badge colorScheme={meta.colorScheme} whiteSpace="normal" textAlign="center" lineHeight="1.3" py="2px">
              {meta.label}
            </Badge>
          ),
          ageing: <NoWrap>{ageingLabel(f.ageing_days)}</NoWrap>,
          last_follow_up: <NoWrap>{formatDateTime(f.last_follow_up_at)}</NoWrap>,
          next_follow_up: <NoWrap>{formatDate(f.next_follow_up_date)}</NoWrap>,
          action: (
            <Button size="xs" colorScheme="purple" variant="outline" onClick={() => router.push(`/lr-followup/${f.lr_followup_id}`)}>
              Open
            </Button>
          ),
        };
      }),
    [data, router]
  );

  const cards = summary
    ? [
        { label: "Total Open Follow-ups", value: summary.total_open, onClick: () => setFilters(EMPTY_FILTERS) },
        { label: "Advance Paid Pending", value: summary.advance_open, onClick: () => set({ status: "OPEN", source_type: "ADVANCE_REQUEST" }) },
        { label: "Manual LR Pending", value: summary.manual_open, onClick: () => set({ status: "OPEN", source_type: "MANUAL" }) },
        { label: "Dispatch / LR Pending", value: summary.dispatch_pending, onClick: () => set({ status: "DISPATCH_PENDING" }) },
        { label: "In Transit", value: summary.in_transit, onClick: () => set({ status: "IN_TRANSIT" }) },
        { label: "Overdue", value: summary.overdue, tone: "red", onClick: () => set({ status: "OPEN", overdue_only: true }) },
        { label: "Advance Outstanding Amount", value: currencyFormatter(summary.outstanding_amount) },
      ]
    : [];

  // Closed follow-ups, split by outcome: stock actually received vs.
  // resolved without receipt. Never added together.
  const outcomeCards = summary
    ? [
        {
          label: "Closed – Goods Received",
          value: summary.closed_goods_received,
          tone: "green",
          onClick: () => set({ status: "CLOSED:GOODS_RECEIVED" }),
        },
        {
          label: "Closed – Without Receipt",
          value: summary.closed_without_receipt,
          hint: `Refunded ${summary.closed_refunded} · Adjusted ${summary.closed_adjusted} · Cancelled ${summary.closed_cancelled}`,
          tone: "red",
          onClick: () => set({ status: "CLOSED:WITHOUT_RECEIPT" }),
        },
      ]
    : [];

  return (
    <GlobalWrapper title="LR Follow-up" permissionKey={["view_lr_followup"]}>
      <CustomContainer title="LR Follow-up List / Dashboard" filledHeader>
        {canCreate && (
          <Flex justify="flex-end" mb="12px">
            <Button size="sm" colorScheme="purple" onClick={() => router.push("/lr-followup/create")}>
              Create LR Follow-up
            </Button>
          </Flex>
        )}
        {summary && (summary.missing_advance_followups > 0 || summary.verification_required > 0) && (
          <Flex
            mb="14px"
            p="10px 14px"
            borderRadius="6px"
            bg="orange.50"
            borderWidth="1px"
            borderColor="orange.200"
            justify="space-between"
            align="center"
            gap="10px"
            wrap="wrap"
          >
            <Text fontSize="sm" color="orange.800">
              {summary.missing_advance_followups > 0 &&
                `${summary.missing_advance_followups} paid advance request(s) have no LR Follow-up yet. `}
              {summary.verification_required > 0 &&
                `${summary.verification_required} legacy follow-up(s) are waiting for verification and are not counted below.`}
            </Text>
            {canManage && (
              <Button size="sm" colorScheme="orange" onClick={() => router.push("/lr-followup/legacy")}>
                Legacy Verification
              </Button>
            )}
          </Flex>
        )}

        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)", xl: "repeat(7, 1fr)" }} gap="10px" mb="16px">
          {cards.map((c) => (
            <Box
              key={c.label}
              p="12px"
              borderRadius="8px"
              borderWidth="1px"
              bg="white"
              cursor={c.onClick ? "pointer" : "default"}
              onClick={c.onClick}
              _hover={c.onClick ? { borderColor: "purple.300" } : undefined}
            >
              <Text fontSize="xs" color="gray.500">
                {c.label}
              </Text>
              <Text fontSize="xl" fontWeight="700" color={c.tone === "red" && Number(c.value) > 0 ? "red.600" : "gray.800"}>
                {c.value}
              </Text>
            </Box>
          ))}
        </Grid>

        <Flex gap="10px" mb="16px" wrap="wrap">
          {outcomeCards.map((c) => (
            <Box
              key={c.label}
              p="10px 14px"
              borderRadius="8px"
              borderWidth="1px"
              borderLeftWidth="4px"
              borderLeftColor={c.tone === "green" ? "green.400" : "red.400"}
              bg="white"
              cursor="pointer"
              onClick={c.onClick}
              minW="220px"
            >
              <Text fontSize="xs" color="gray.500">
                {c.label}
              </Text>
              <Text fontSize="lg" fontWeight="700">
                {c.value}
              </Text>
              {c.hint && (
                <Text fontSize="xs" color="gray.500">
                  {c.hint}
                </Text>
              )}
            </Box>
          ))}
        </Flex>

        <Flex gap="10px" wrap="wrap" align="flex-end" mb="14px">
          <FilterBox label="Status">
            <Select size="sm" value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="OPEN">Open (pending goods)</option>
              {Object.keys(STATUS_META)
                .filter((k) => k !== "GOODS_RECEIVED")
                .map((k) => (
                  <option key={k} value={k}>
                    {k === "CLOSED" ? "Closed – any outcome" : STATUS_META[k].label}
                  </option>
                ))}
              {CLOSED_OUTCOME_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.value}
                </option>
              ))}
              <option value="ALL">All</option>
            </Select>
          </FilterBox>
          <FilterBox label="Source Type">
            <Select size="sm" value={filters.source_type} onChange={(e) => set({ source_type: e.target.value })}>
              <option value="">Advance and Manual</option>
              <option value="ADVANCE_REQUEST">Advance</option>
              <option value="MANUAL">Manual</option>
            </Select>
          </FilterBox>
          <FilterBox label="Supplier" width="220px">
            <SearchableDropdown
              options={suppliers}
              value={filters.distributor_code}
              onChange={(id) => set({ distributor_code: id || null })}
              placeholder="All suppliers"
            />
          </FilterBox>
          <FilterBox label="Paid / Created from">
            <Input size="sm" type="date" value={filters.from_date} onChange={(e) => set({ from_date: e.target.value })} />
          </FilterBox>
          <FilterBox label="to">
            <Input size="sm" type="date" value={filters.to_date} onChange={(e) => set({ to_date: e.target.value })} />
          </FilterBox>
          <FilterBox label="Ageing">
            <Select size="sm" value={filters.ageing} onChange={(e) => set({ ageing: e.target.value })}>
              <option value="">Any</option>
              {AGEING_BUCKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.value}
                </option>
              ))}
            </Select>
          </FilterBox>
          <Checkbox
            size="sm"
            isChecked={filters.overdue_only}
            onChange={(e) => set({ overdue_only: e.target.checked })}
            mb="6px"
          >
            Overdue only
          </Checkbox>
          <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            Reset
          </Button>
        </Flex>

        <Text fontSize="xs" color="gray.500" mb="8px">
          Sorted with overdue first, most days overdue first, then the oldest paid / purchase date.
        </Text>

        {loading && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {!loading && error && (
          <Flex direction="column" align="center" gap="10px" py="30px">
            <EmptyData message={error} />
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          </Flex>
        )}
        {!loading && !error && rows.length === 0 && <EmptyData message="No follow-ups match these filters" />}
        {!loading && !error && rows.length > 0 && (
          <>
            <Box overflowX="auto" sx={{ "& table": { tableLayout: "auto" } }}>
              <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" showPagination />
            </Box>
            {data.count > rows.length && (
              <Text fontSize="xs" color="gray.500" mt="6px">
                Showing the first {rows.length} of {data.count}. Narrow the filters to see the rest.
              </Text>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

function NoWrap({ children }) {
  return (
    <Text as="span" whiteSpace="nowrap">
      {children}
    </Text>
  );
}

function FilterBox({ label, children, width = "170px" }) {
  return (
    <Flex direction="column" gap="2px" width={width}>
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

export default LrFollowupDashboard;
