import React, { useCallback, useState, useEffect } from "react";
import moment from "moment";
import {
  Badge,
  Box,
  Button,
  Grid,
  Text,
  VStack,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import GstModuleWrapper, {
  useGstTaxpayerUi,
} from "../../../components/gst/GstModuleWrapper";
import { getTaxpayerSession } from "../../../helper/gstTaxpayer";

function formatFromNow(ms) {
  if (ms == null || ms === "" || Number.isNaN(Number(ms))) {
    return { relative: "Not available", absolute: null };
  }
  const m = moment(Number(ms));
  return {
    relative: m.fromNow(),
    absolute: m.format("dddd, D MMM YYYY [at] h:mm a"),
  };
}

function DateValue({ ms }) {
  const { relative, absolute } = formatFromNow(ms);
  return (
    <Box>
      <Text fontWeight="medium" color="gray.800">
        {relative}
      </Text>
      {absolute ? (
        <Text fontSize="xs" color="gray.500" mt={0.5}>
          ({absolute})
        </Text>
      ) : null}
    </Box>
  );
}

function boolBadge(value, { yes, no, yesScheme, noScheme }) {
  return (
    <Badge colorScheme={value ? yesScheme : noScheme} fontSize="0.75rem">
      {value ? yes : no}
    </Badge>
  );
}

function DetailField({ label, hint, children }) {
  return (
    <Grid
      templateColumns={{ base: "1fr", sm: "minmax(0, 240px) 1fr" }}
      gap={{ base: 2, sm: 4 }}
      alignItems="start"
      py={3}
      borderBottomWidth="1px"
      borderColor="gray.100"
      _last={{ borderBottomWidth: 0 }}
    >
      <Box>
        <Text fontSize="sm" color="gray.700" fontWeight="semibold">
          {label}
        </Text>
        {hint ? (
          <Text fontSize="xs" color="gray.500" mt={0.5}>
            {hint}
          </Text>
        ) : null}
      </Box>
      <Box fontSize="sm">{children}</Box>
    </Grid>
  );
}

function GstPortalContent() {
  const { openOtpModal } = useGstTaxpayerUi();
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const body = await getTaxpayerSession();
      setSession(body?.session ?? null);
    } catch (e) {
      setLoadError(e?.message || "Something went wrong while loading this page.");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const submitMode =
    session?.has_taxpayer_token === true ? "revalidate" : "verify";

  const openRevalidateModal = useCallback(() => {
    openOtpModal({
      title: "Confirm with OTP",
      submitMode,
      onSuccessExtra: () => {
        loadSession();
      },
    });
  }, [openOtpModal, submitMode, loadSession]);

  const headerActions =
    session && !loading ? (
      <Button colorScheme="teal" size="sm" onClick={openRevalidateModal}>
        Confirm again with OTP
      </Button>
    ) : loadError ? (
      <Button colorScheme="teal" size="sm" variant="outline" onClick={loadSession}>
        Try again
      </Button>
    ) : null;

  return (
    <CustomContainer
      title="GST Portal"
      filledHeader
      rightSection={headerActions}
      colorScheme="teal"
    >
      <VStack align="stretch" spacing={5}>
        {loading ? (
          <Text color="gray.600">Checking your connection to the GST portal…</Text>
        ) : loadError ? (
          <Box rounded="md" borderWidth="1px" borderColor="red.200" bg="red.50" p={4}>
            <Text color="red.800" fontWeight="semibold" fontSize="sm" mb={1}>
              We couldn&apos;t load this information
            </Text>
            <Text color="red.700" fontSize="sm">
              {loadError}
            </Text>
            <Text color="red.600" fontSize="xs" mt={2}>
              Tap &quot;Try again&quot; above, or refresh the page. If it keeps happening,
              contact support.
            </Text>
          </Box>
        ) : !session ? (
          <Box rounded="md" borderWidth="1px" borderColor="gray.200" bg="gray.50" p={4}>
            <Text color="gray.800" fontWeight="semibold" fontSize="sm" mb={1}>
              GST portal isn&apos;t connected yet
            </Text>
            <Text color="gray.700" fontSize="sm">
              There is no active link to the government GST portal from this store right
              now. Your administrator may still be setting this up.
            </Text>
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.600" lineHeight="tall">
              This page shows how your store is connected to the official GST portal. When
              the government asks for a one-time password (OTP), use the button above and
              follow the steps on your phone or email.
            </Text>

            <CustomContainer
              title="Connection details"
              smallHeader
              subtleHeader
              colorScheme="teal"
            >
              <VStack align="stretch" spacing={0}>
                <DetailField
                  label="Next automatic refresh"
                  hint="The system quietly renews your link in the background until then."
                >
                  <DateValue ms={session.token_expires_at_ms} />
                </DetailField>
                <DetailField
                  label="Sign-in stays valid until"
                  hint="After this date you will need to confirm again with an OTP from the GST portal."
                >
                  <DateValue ms={session.session_expires_at_ms} />
                </DetailField>
                <DetailField
                  label="Last time you confirmed with OTP"
                  hint="When you last entered the code sent by the GST portal."
                >
                  <DateValue ms={session.last_otp_verified_at_ms} />
                </DetailField>
                <DetailField
                  label="Do you need to sign in again?"
                  hint="If this says yes, use the button above to get a new code."
                >
                  {boolBadge(session.needs_revalidation, {
                    yes: "Yes — use OTP",
                    no: "No — you're all set",
                    yesScheme: "orange",
                    noScheme: "green",
                  })}
                </DetailField>
                <DetailField
                  label="Is your portal access still active?"
                  hint="If this says expired, sign in again with OTP to keep using GST features."
                >
                  {boolBadge(session.session_expired, {
                    yes: "Expired",
                    no: "Active",
                    yesScheme: "red",
                    noScheme: "green",
                  })}
                </DetailField>
              </VStack>
            </CustomContainer>
          </>
        )}
      </VStack>
    </CustomContainer>
  );
}

export default function GstPortalPage() {
  return (
    <GlobalWrapper title="GST Portal" permissionKey={["view_gst_portal"]}>
      <GstModuleWrapper>
        <GstPortalContent />
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}
