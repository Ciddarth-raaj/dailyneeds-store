import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Badge, Box, Flex, Grid, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FollowupActions from "../../components/lrFollowup/FollowupActions";
import currencyFormatter from "../../util/currencyFormatter";
import { getLrFollowup } from "../../helper/lrFollowup";
import {
  ACTIVITY_LABEL,
  CLOSURE_LABEL,
  SOURCE_META,
  ageingLabel,
  followupRef,
  formatDate,
  formatDateTime,
  outcomeMeta,
  sourceHref,
  sourceLabel,
  statusMeta,
  transporterLabel,
} from "../../util/lrFollowup";

/** One follow-up: its source, its tracking details, its actions, and its full history. */
function LrFollowupDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [followup, setFollowup] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const body = await getLrFollowup(id);
      if (!body || body.code !== 200) throw new Error((body && (body.detail || body.msg)) || "Could not load");
      setFollowup(body.data);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = followup ? `LR Follow-up ${followupRef(followup)}` : "LR Follow-up";
  // A closed follow-up is badged with its outcome, never just "Closed".
  const meta = followup ? outcomeMeta(followup) : null;
  const href = followup ? sourceHref(followup) : null;
  const manual = Boolean(followup) && followup.source_type === "MANUAL";

  return (
    <GlobalWrapper title={title} permissionKey={["view_lr_followup"]}>
      <CustomContainer
        title={title}
        filledHeader
        rightSection={
          meta && (
            <Flex gap="8px" align="center">
              {followup.is_overdue && <Badge colorScheme="red">Overdue</Badge>}
              <Badge colorScheme={meta.colorScheme} fontSize="0.8em">
                {meta.label}
              </Badge>
            </Flex>
          )
        }
      >
        {!followup && !error && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {error && (
          <Text color="gray.600" py="30px" textAlign="center">
            {error}
          </Text>
        )}

        {followup && (
          <Flex direction="column" gap="18px">
            <Flex justify="space-between" align="center" wrap="wrap" gap="10px">
              <Text fontWeight="600">
                {href ? (
                  <Link href={href}>
                    <a style={{ color: "#6b46c1" }}>{sourceLabel(followup)}</a>
                  </Link>
                ) : (
                  sourceLabel(followup)
                )}
                {followup.is_legacy ? (
                  <Badge ml="8px" colorScheme="orange">
                    Legacy
                  </Badge>
                ) : null}
              </Text>
              <FollowupActions followup={followup} onChanged={(d) => setFollowup(d)} />
            </Flex>

            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="14px">
              <Info label="Follow-up ID" value={followupRef(followup)} />
              <Info label="Source Type" value={(SOURCE_META[followup.source_type] || {}).label} />
              <Info label="Supplier" value={followup.supplier_name ? `${followup.supplier_name} (${followup.distributor_code})` : followup.distributor_code} />
              {/* A manual follow-up has no amount, bill or outlet: delivery is always to the Warehouse. */}
              {!manual && <Info label="Amount" value={currencyFormatter(followup.amount)} />}
              <Info label={manual ? "Created Date" : "Advance Paid Date"} value={formatDate(followup.source_date)} />
              {!manual && <Info label="Invoice / PI No." value={followup.invoice_number || "-"} />}
              {!manual && <Info label="Receiving Outlet" value={followup.outlet_name || "-"} />}
              <Info label="Ageing" value={ageingLabel(followup.ageing_days)} />
              <Info label="LR No." value={followup.lr_no || "-"} />
              <Info label="Transporter" value={transporterLabel(followup)} />
              <Info label="Dispatch Date" value={formatDate(followup.dispatch_date)} />
              <Info
                label="Expected Delivery"
                value={
                  <Text as="span" color={followup.is_overdue ? "red.600" : undefined}>
                    {formatDate(followup.expected_delivery_date)}
                    {followup.is_overdue ? ` (${followup.days_overdue || ""} days overdue)` : ""}
                  </Text>
                }
              />
              <Info label="Last Follow-up" value={formatDateTime(followup.last_follow_up_at)} />
              <Info label="Next Follow-up" value={formatDate(followup.next_follow_up_date)} />
              <Info label="Latest Remark" value={followup.latest_remark || "-"} />
              <Info
                label="Actual Goods Received"
                value={
                  followup.goods_received_at
                    ? `${formatDateTime(followup.goods_received_at)}${
                        followup.goods_received_by_name ? ` by ${followup.goods_received_by_name}` : ""
                      }`
                    : "-"
                }
              />
              <Info label="Created At" value={formatDateTime(followup.created_at)} />
              <Info label="Updated At" value={formatDateTime(followup.updated_at)} />
              <Info
                label="Closed At"
                value={
                  followup.closed_at
                    ? `${formatDateTime(followup.closed_at)}${followup.closed_by_name ? ` by ${followup.closed_by_name}` : ""}`
                    : "-"
                }
              />
              <Info
                label="Closure Outcome"
                value={
                  followup.closure_reason ? (
                    <Badge colorScheme={meta.colorScheme}>
                      {followup.closure_reason === "GOODS_RECEIVED"
                        ? "Goods Received (stock received)"
                        : `${CLOSURE_LABEL[followup.closure_reason]} (no stock received)`}
                    </Badge>
                  ) : (
                    "-"
                  )
                }
              />
              <Info label="Closure Remark" value={followup.closure_remark || "-"} />
            </Grid>

            {followup.source && (
              <CustomContainer title={manual ? "Created Manually" : `Source — ${followup.source.ref}`} smallHeader>
                <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap="12px">
                  {followup.source.type === "ADVANCE_REQUEST" ? (
                    <>
                      <Info label="Advance Request" value={followup.source.ref} />
                      <Info label="Status" value={followup.source.status} />
                      <Info label="Invoice / PI No." value={followup.source.invoice_number || "-"} />
                      <Info
                        label="Paid"
                        value={`${formatDateTime(followup.source.paid_at)}${
                          followup.source.paid_by_name ? ` by ${followup.source.paid_by_name}` : ""
                        }`}
                      />
                    </>
                  ) : (
                    <>
                      <Info label="Remarks" value={followup.source.remarks || "-"} />
                      <Info
                        label="Created"
                        value={`${formatDateTime(followup.source.created_at)}${
                          followup.source.created_by_name ? ` by ${followup.source.created_by_name}` : ""
                        }`}
                      />
                    </>
                  )}
                </Grid>
              </CustomContainer>
            )}

            <CustomContainer title="Follow-up History" smallHeader>
              <Flex direction="column" gap="10px">
                {(followup.activity || []).map((a) => (
                  <Box key={a.lr_followup_activity_id} borderLeftWidth="3px" borderColor="purple.200" pl="10px">
                    <Text fontSize="xs" color="gray.500">
                      {formatDateTime(a.created_at)} · {ACTIVITY_LABEL[a.activity_type] || a.activity_type} ·{" "}
                      {a.created_by_name || (a.created_by ? `#${a.created_by}` : "System")}
                      {a.old_status && a.new_status && a.old_status !== a.new_status
                        ? ` · ${statusMeta(a.old_status).label} → ${statusMeta(a.new_status).label}`
                        : ""}
                    </Text>
                    {a.remark && <Text fontSize="sm">{a.remark}</Text>}
                    {a.next_follow_up_date && (
                      <Text fontSize="xs" color="gray.600">
                        Next follow-up: {formatDate(a.next_follow_up_date)}
                      </Text>
                    )}
                  </Box>
                ))}
              </Flex>
            </CustomContainer>
          </Flex>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

function Info({ label, value }) {
  return (
    <Flex direction="column" gap="2px">
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" as="div" wordBreak="break-word">
        {value === undefined || value === null || value === "" ? "-" : value}
      </Text>
    </Flex>
  );
}

export default LrFollowupDetail;
