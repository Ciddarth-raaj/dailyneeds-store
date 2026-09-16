import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Link,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";

import useEmployeeTelegram from "../../customHooks/useEmployeeTelegram";
import {
  TELEGRAM_STATUS,
  countdownText,
  isConnected,
  isReconnectInFlight,
  telegramBadgeScheme,
  telegramLabel,
} from "../../util/employeeTelegram";

/**
 * TELEGRAM SETUP - the whole flow, in one component.
 *
 * USED BY BOTH the Add Employee wizard's Telegram stage and the Employee
 * Master's Telegram card. One implementation of a one-time credential's
 * lifetime, one set of labels, one polling lifecycle: two copies would drift,
 * and the copy that drifted would be the one holding a QR a little too long.
 *
 * IT IS FOR A MANAGER STANDING BESIDE THE EMPLOYEE. Big QR, one instruction,
 * no technical language. Nothing on this screen mentions tokens, hashes, chat
 * ids or the update poller.
 *
 * ===================== WHAT IS NEVER RENDERED ============================
 *
 *   the raw deep link      it is a working credential. It is encoded INTO the
 *                          QR and used as an href - never printed as text,
 *                          never copyable, never in a toast or an error.
 *   a Telegram user id     nor a chat id: the backend does not return them.
 *   a mobile number        not the one Telegram shared, not the one on file,
 *                          and not a masked form of either - the employee
 *                          holds one of them already and the screen is read
 *                          by whoever is holding the phone.
 */
function StatusBadge({ status }) {
  return (
    <Badge colorScheme={telegramBadgeScheme(status)} fontSize="0.8em" px={2} py={1}>
      {telegramLabel(status)}
    </Badge>
  );
}

function TelegramSetupPanel({
  employeeId,
  employeeName,
  outletName,
  canManage = false,
  onEditMobile = null,
  compact = false,
  /**
   * Told whether the employee is connected, whenever the backend's answer
   * changes. The wizard uses it to decide which ending to offer - Finish, or
   * Skip for now & Finish - and nothing infers a connection from having
   * generated a QR.
   */
  onStatusChange = null,
}) {
  const {
    status,
    loading,
    error,
    link,
    attempt,
    expiresAt,
    expired,
    generating,
    disconnecting,
    generate,
    disconnect,
  } = useEmployeeTelegram(employeeId);

  /** Re-rendered once a second only while a QR is on screen. */
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!link) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [link]);

  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const current = (status && status.status) || null;
  const connected = isConnected(current);

  useEffect(() => {
    if (typeof onStatusChange === "function") onStatusChange(connected);
  }, [connected, onStatusChange]);

  /**
   * A NEW ACCOUNT IS BEING VERIFIED WHILE THE OLD ONE IS STILL CONNECTED.
   * Said plainly, because "Connected" beside a QR code is otherwise a
   * contradiction the manager has to work out for themselves.
   */
  const reconnecting = isReconnectInFlight({
    status: current,
    attempt,
    hasLiveLink: Boolean(link) && !expired,
  });

  if (loading && !status) {
    return (
      <Flex align="center" gap={3} py={4}>
        <Spinner size="sm" />
        <Text fontSize="sm">Checking Telegram status…</Text>
      </Flex>
    );
  }

  return (
    <Stack spacing={4}>
      {!compact && (
        <Box>
          <Text fontWeight="bold" fontSize="lg">
            {employeeName || "Employee"}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Employee ID: {employeeId}
            {outletName ? ` • ${outletName}` : ""}
          </Text>
        </Box>
      )}

      <Flex align="center" gap={3} wrap="wrap">
        <Text fontSize="sm" fontWeight="semibold">
          Telegram:
        </Text>
        <StatusBadge status={current} />
      </Flex>

      {error && (
        <Alert status="error" borderRadius="md" fontSize="sm">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {reconnecting && (
        <Alert status="info" borderRadius="md" fontSize="sm">
          <AlertIcon />
          Waiting for the new Telegram account to be verified. The current account stays
          connected until it is.
        </Alert>
      )}

      {/* ---------------------------------------------------- connected -- */}
      {connected && !reconnecting && (
        <Stack spacing={2}>
          <Alert status="success" borderRadius="md" fontSize="sm">
            <AlertIcon />
            Telegram Connected
          </Alert>
          {status && status.telegram_username && (
            <Text fontSize="sm">Telegram: @{status.telegram_username}</Text>
          )}
          {status && status.connected_at && (
            <Text fontSize="sm" color="gray.600">
              Connected on {new Date(status.connected_at).toLocaleString()}
            </Text>
          )}
          {/* CONNECTED IS NOT COMPLETE. Group assignment has not shipped, so
              the screen says so rather than implying the employee is done. */}
          <Text fontSize="sm" color="gray.600">
            Telegram is connected. Group assignment will be completed after Telegram Group
            Mapping is configured.
          </Text>
        </Stack>
      )}

      {/* ----------------------------------------------------- mismatch -- */}
      {current === TELEGRAM_STATUS.MOBILE_MISMATCH && (
        <Alert status="warning" borderRadius="md" fontSize="sm">
          <AlertIcon />
          <Box>
            {/* NEITHER NUMBER IS NAMED - not the shared one, not the stored
                one, not a masked form of either. */}
            <Text>Telegram mobile does not match the mobile recorded for this employee.</Text>
            <Text mt={1}>Correct the employee mobile number and generate a new QR.</Text>
            {onEditMobile && canManage && (
              <Button mt={2} size="xs" variant="outline" onClick={onEditMobile}>
                Edit employee details
              </Button>
            )}
          </Box>
        </Alert>
      )}

      {/* ------------------------------------------------------ the QR --- */}
      {canManage && link && !expired && (
        <Stack spacing={3} align="center">
          <Text fontSize="sm" fontWeight="semibold" textAlign="center">
            Scan this QR using the employee&apos;s own phone
          </Text>
          {/* The link is encoded, never printed. `maxWidth: 100%` is what
              keeps it on a phone screen without horizontal scrolling. */}
          <Box bg="white" p={3} borderRadius="md" borderWidth="1px" maxWidth="100%">
            <QRCodeSVG value={link} size={200} includeMargin style={{ maxWidth: "100%", height: "auto" }} />
          </Box>
          <Text fontSize="sm" color="gray.600">
            QR expires in {countdownText(expiresAt)}
          </Text>
          <Stack direction={{ base: "column", sm: "row" }} spacing={2} width="100%" justify="center">
            <Link href={link} isExternal _hover={{ textDecoration: "none" }}>
              <Button size="sm" colorScheme="telegram" width="100%">
                Open Telegram
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={generate} isLoading={generating}>
              Generate New QR
            </Button>
          </Stack>
          <Text fontSize="xs" color="gray.600" textAlign="center">
            After opening Telegram, tap Share Phone Number. Do not type the number manually.
          </Text>
        </Stack>
      )}

      {canManage && expired && (
        <Alert status="info" borderRadius="md" fontSize="sm">
          <AlertIcon />
          This QR has expired. Generate a new one to continue.
        </Alert>
      )}

      {/* ------------------------------------------------------ actions -- */}
      {canManage && !link && (
        <Stack direction={{ base: "column", sm: "row" }} spacing={2}>
          <Button size="sm" colorScheme="telegram" onClick={generate} isLoading={generating}>
            {connected ? "Change Telegram" : "Generate Telegram QR"}
          </Button>
          {connected && !confirmingDisconnect && (
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={() => setConfirmingDisconnect(true)}
            >
              Disconnect Telegram
            </Button>
          )}
        </Stack>
      )}

      {/* CHANGE TELEGRAM NEVER DISCONNECTS FIRST. The backend replaces an
          identity atomically only once the new account has verified, so the
          employee keeps a working connection while the new one is proven. */}


      {confirmingDisconnect && (
        <Alert status="warning" borderRadius="md" fontSize="sm">
          <AlertIcon />
          <Box>
            <Text>Disconnect this employee&apos;s Telegram account?</Text>
            <Stack direction="row" spacing={2} mt={2}>
              <Button
                size="xs"
                colorScheme="red"
                isLoading={disconnecting}
                onClick={async () => {
                  await disconnect();
                  setConfirmingDisconnect(false);
                }}
              >
                Disconnect
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmingDisconnect(false)}>
                Cancel
              </Button>
            </Stack>
          </Box>
        </Alert>
      )}

      {!canManage && (
        <>
          <Divider />
          <Text fontSize="xs" color="gray.600">
            You can see this employee&apos;s Telegram status. Setting it up needs employee edit
            rights for their branch.
          </Text>
        </>
      )}
    </Stack>
  );
}

export default TelegramSetupPanel;
