import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Badge, Button, Flex, Grid, Spinner, Text } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import usePermissions from "../../customHooks/usePermissions";
import { getLrFollowupBySource } from "../../helper/lrFollowup";
import {
  PERMISSIONS,
  ageingLabel,
  cardState,
  followupRef,
  formatDate,
  statusMeta,
} from "../../util/lrFollowup";

/**
 * The small read-only LR Follow-up card on an Advance Request (once paid)
 * and on a Credit Purchase. It creates nothing and changes nothing: the
 * follow-up is created by the backend when the advance is paid or the
 * purchase is saved, and is worked from its own screen.
 *
 * A source that should have a follow-up and has none is shown as an
 * exception, never as an empty space.
 */
function LrFollowupCard({ sourceType, sourceId, sourceStatus }) {
  const router = useRouter();
  const canView = usePermissions([PERMISSIONS.VIEW]);
  const [response, setResponse] = useState(null);

  const wanted = canView && sourceId && (sourceType !== "ADVANCE_REQUEST" || sourceStatus === "paid");

  useEffect(() => {
    if (!wanted) return undefined;
    let cancelled = false;
    getLrFollowupBySource(sourceType, sourceId)
      .then((body) => {
        if (cancelled) return;
        if (body && body.code === 200) setResponse(body.data);
        else setResponse({ error: (body && (body.detail || body.msg)) || "Could not load the LR follow-up" });
      })
      .catch(() => !cancelled && setResponse({ error: "Could not load the LR follow-up" }));
    return () => {
      cancelled = true;
    };
  }, [wanted, sourceType, sourceId, sourceStatus]);

  const state = cardState({ sourceType, sourceStatus, response, canView });
  if (state.kind === "hidden") return null;

  return (
    <CustomContainer title="LR Follow-up" smallHeader>
      {state.kind === "loading" && <Spinner size="sm" />}

      {state.kind === "error" && (
        <Text fontSize="sm" color="red.500">
          {state.message}
        </Text>
      )}

      {state.kind === "exception" && (
        <Flex direction="column" gap="6px" p="10px" borderRadius="6px" bg="red.50" borderWidth="1px" borderColor="red.200">
          <Text fontWeight="600" color="red.700" fontSize="sm">
            <i className="fa fa-exclamation-triangle" /> LR Follow-up missing
          </Text>
          <Text fontSize="sm" color="red.700">
            {state.message}
          </Text>
        </Flex>
      )}

      {state.kind === "followup" && (
        <Flex direction={{ base: "column", md: "row" }} gap="16px" align={{ md: "center" }} justify="space-between">
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, auto)" }} gap="16px">
            <Info label="Follow-up Ref" value={followupRef(state.followup)} />
            <Info
              label="Current Status"
              value={
                <Badge colorScheme={statusMeta(state.followup.status).colorScheme}>
                  {statusMeta(state.followup.status).label}
                </Badge>
              }
            />
            <Info label="Ageing" value={ageingLabel(state.followup.ageing_days)} />
            <Info
              label="Expected Delivery"
              value={
                <Text as="span" color={state.followup.is_overdue ? "red.600" : undefined}>
                  {formatDate(state.followup.expected_delivery_date)}
                  {state.followup.is_overdue ? " (overdue)" : ""}
                </Text>
              }
            />
          </Grid>
          <Button
            size="sm"
            colorScheme="purple"
            variant="outline"
            onClick={() => router.push(`/lr-followup/${state.followup.lr_followup_id}`)}
          >
            View Follow-up
          </Button>
        </Flex>
      )}
    </CustomContainer>
  );
}

function Info({ label, value }) {
  return (
    <Flex direction="column" gap="2px">
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" as="div">
        {value}
      </Text>
    </Flex>
  );
}

export default LrFollowupCard;
