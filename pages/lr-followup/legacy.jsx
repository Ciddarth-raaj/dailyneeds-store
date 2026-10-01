import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Box, Button, Checkbox, Flex, Spinner, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";
import Table from "../../components/table/table";
import FollowupActions from "../../components/lrFollowup/FollowupActions";
import currencyFormatter from "../../util/currencyFormatter";
import { getLegacyQueue, runLegacyBackfill, unwrap } from "../../helper/lrFollowup";
import { SOURCE_META, ageingLabel, followupRef, formatDate, outcomeMeta, sourceHref, sourceRef } from "../../util/lrFollowup";

const HEADINGS = {
  ref: "Follow-up",
  source_type: "Source Type",
  source: "Advance Request / Purchase Ref",
  supplier: "Supplier",
  amount: "Amount",
  source_date: "Paid / Purchase Date",
  ageing: "Days Since",
  evidence: "Existing Receipt Evidence",
  finding: "Current System Finding",
  status: "Status",
  action: "Action",
};

/**
 * Legacy Follow-up Verification - a temporary admin screen.
 *
 * At go-live, paid advance requests that predate the module are brought in by
 * the backfill as Verification Required, because dnds holds no goods-receipt
 * record linked to an advance and nothing can be assumed either way. Each
 * waits here for a person to say what happened. Every decision is kept in
 * the follow-up's history; the original advance request is never changed.
 */
function LegacyVerification() {
  const [includeDecided, setIncludeDecided] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(unwrap(await getLegacyQueue({ include_decided: includeDecided })));
    } catch (err) {
      setError(err.message);
    }
  }, [includeDecided]);

  useEffect(() => {
    load();
  }, [load]);

  const backfill = async () => {
    setRunning(true);
    try {
      const result = unwrap(await runLegacyBackfill());
      toast.success(
        result.created > 0
          ? `${result.created} legacy follow-up(s) brought in for verification`
          : "Nothing to bring in — every paid advance already has a follow-up"
      );
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const rows = useMemo(
    () =>
      ((data && data.items) || []).map((f) => {
        const meta = outcomeMeta(f);
        const href = sourceHref(f);
        return {
          ref: (
            <Link href={`/lr-followup/${f.lr_followup_id}`}>
              <a style={{ color: "#6b46c1" }}>{followupRef(f)}</a>
            </Link>
          ),
          source_type: (SOURCE_META[f.source_type] || {}).label,
          source: href ? (
            <Link href={href}>
              <a style={{ color: "#6b46c1" }}>{sourceRef(f)}</a>
            </Link>
          ) : (
            sourceRef(f)
          ),
          supplier: f.supplier_name || "-",
          amount: currencyFormatter(f.amount),
          source_date: formatDate(f.source_date),
          ageing: ageingLabel(f.ageing_days),
          evidence: f.receipt_evidence,
          finding: (
            <Text fontSize="xs" maxW="320px">
              {f.system_finding}
            </Text>
          ),
          status: (
            <Badge colorScheme={meta.colorScheme} whiteSpace="normal" textAlign="center" lineHeight="1.3" py="2px">
              {meta.label}
            </Badge>
          ),
          action: <FollowupActions followup={f} size="xs" onChanged={load} />,
        };
      }),
    [data, load]
  );

  return (
    <GlobalWrapper title="Legacy Follow-up Verification" permissionKey={["manage_lr_legacy_verification"]}>
      <CustomContainer
        title="Legacy Follow-up Verification"
        filledHeader
        rightSection={
          <Button size="sm" colorScheme="purple" onClick={backfill} isLoading={running}>
            Run Backfill
          </Button>
        }
      >
        <Text fontSize="sm" color="gray.600" mb="10px">
          Paid advance requests from before LR Follow-up went live are not assumed received or pending. Record
          what actually happened: Goods Received, Goods Still Pending (it joins the live follow-ups), Refunded,
          Adjusted / Settled or Cancelled. Run Backfill is safe to repeat — it never creates a second follow-up.
        </Text>
        <Checkbox size="sm" mb="10px" isChecked={includeDecided} onChange={(e) => setIncludeDecided(e.target.checked)}>
          Show decided legacy rows too
        </Checkbox>

        {!data && !error && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {error && <EmptyData message={error} />}
        {data && rows.length === 0 && <EmptyData message="Nothing is waiting for verification" />}
        {data && rows.length > 0 && (
          <Box overflowX="auto" sx={{ "& table": { tableLayout: "auto" } }}>
            <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" showPagination />
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default LegacyVerification;
