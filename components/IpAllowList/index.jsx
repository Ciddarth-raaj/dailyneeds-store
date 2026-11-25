import React from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Code,
  FormControl,
  FormHelperText,
  FormLabel,
  Text,
  Textarea,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";

/** "This device: 203.0.113.10", for a container header. */
export function ThisDevice({ myIp }) {
  return (
    <Text fontSize="13px">
      This device: <Code fontSize="13px">{myIp || "unknown"}</Code>
    </Text>
  );
}

/**
 * Warnings about the address the API resolved for this browser.
 *
 * Loopback is an error: the proxy is not forwarding the client IP and no
 * allow-list can work until it does. A private address is only a warning —
 * correct for a LAN-only deployment, wrong if staff come in over the
 * internet, and the page cannot tell which.
 */
export function ClientIpAlerts({ myIp, ipDiagnostic }) {
  const proxyBroken = ipDiagnostic?.isLoopback === true;

  if (proxyBroken) {
    return (
      <Alert
        status="error"
        borderRadius="md"
        marginBottom="12px"
        alignItems="flex-start"
      >
        <AlertIcon />
        <Box fontSize="13px">
          <AlertTitle fontSize="14px">Restrictions will not work yet</AlertTitle>
          <AlertDescription display="block">
            The API sees every request as coming from{" "}
            <Code fontSize="12px">{myIp}</Code>, which is the server talking
            to itself — not a real network address. Your reverse proxy is not
            sending the client&apos;s IP, so every user looks identical and an
            allow-list here would match all of them. Set{" "}
            <Code fontSize="12px">X-Forwarded-For</Code> on the proxy, then
            reload this page and check the address is your real public IP
            before restricting anyone.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (ipDiagnostic?.isPrivate) {
    return (
      <Alert
        status="warning"
        borderRadius="md"
        marginBottom="12px"
        alignItems="flex-start"
      >
        <AlertIcon />
        <Box fontSize="13px">
          <AlertTitle fontSize="14px">Check this address is right</AlertTitle>
          <AlertDescription display="block">
            <Code fontSize="12px">{myIp}</Code> is a private network address.
            That is correct if staff reach this app over the local network,
            but if they come in over the internet it means the proxy is
            passing the wrong address along.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  return null;
}

/**
 * A comma-separated allow-list editor with the format help, an "add this
 * device's IP" shortcut (withheld when the address is known to be wrong)
 * and a Clear button.
 */
export function IpAllowListEditor({
  value,
  onChange,
  myIp,
  proxyBroken,
  isDisabled = false,
  label = "Allowed addresses",
  helperText = "",
}) {
  const appendMyIp = () =>
    onChange(value.trim() === "" ? myIp : `${value.trim()}, ${myIp}`);

  return (
    <>
      <FormControl>
        <FormLabel fontSize="14px">{label}</FormLabel>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="203.0.113.10, 203.0.113.0/24"
          rows={4}
          fontSize="14px"
          isDisabled={isDisabled}
        />
        <FormHelperText fontSize="12px">
          Comma separated. Each entry can be an exact address (203.0.113.10),
          a CIDR block (203.0.113.0/24), a wildcard (203.0.113.*) or a
          last-octet range (203.0.113.10-20).{helperText ? ` ${helperText}` : ""}
        </FormHelperText>
      </FormControl>

      {!isDisabled ? (
        <Wrap marginTop="12px" spacing={2}>
          {myIp && !proxyBroken ? (
            <WrapItem>
              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={appendMyIp}
              >
                Add this device&apos;s IP ({myIp})
              </Button>
            </WrapItem>
          ) : null}
          <WrapItem>
            <Button size="xs" variant="ghost" onClick={() => onChange("")}>
              Clear
            </Button>
          </WrapItem>
        </Wrap>
      ) : null}
    </>
  );
}
