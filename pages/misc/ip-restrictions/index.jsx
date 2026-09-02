import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Switch,
  Text,
  Textarea,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import AgGrid from "../../../components/AgGrid";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import UserIpRestrictionHelper from "../../../helper/userIpRestriction";
import usePermissions from "../../../customHooks/usePermissions";

const PERMISSION_KEY = "manage_ip_restrictions";

/**
 * Per-user IP access admin screen.
 *
 * Two settings per user, deliberately independent:
 *
 *   Outside access on   the user works from anywhere; their addresses stay
 *                       saved but are not enforced
 *   Outside access off  the user is confined to those addresses, at login
 *                       and for any session already open
 *
 * Keeping the list while access is open is the point: letting someone work
 * from home for a week should not mean retyping the store's IP afterwards.
 */
function IpRestrictions() {
  const canManage = usePermissions(PERMISSION_KEY);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myIp, setMyIp] = useState("");
  const [ipDiagnostic, setIpDiagnostic] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [allowOutside, setAllowOutside] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    UserIpRestrictionHelper.getAll()
      .then((data) => setRows(data || []))
      .catch((err) => toast.error(err?.message || "Could not load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    UserIpRestrictionHelper.getMyIp()
      .then((info) => {
        setMyIp(info?.ip || "");
        setIpDiagnostic(info || null);
      })
      .catch(() => {
        setMyIp("");
        setIpDiagnostic(null);
      });
  }, [load]);

  const openEditor = useCallback((row) => {
    setEditing(row);
    setDraft((row?.allowed_ips || []).join(", "));
    setAllowOutside(row?.allow_outside_access !== false);
  }, []);

  const closeEditor = () => {
    setEditing(null);
    setDraft("");
    setAllowOutside(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await UserIpRestrictionHelper.update(editing.user_id, draft, allowOutside);
      toast.success(
        allowOutside
          ? "User can now sign in from any network"
          : "User is now restricted to the allowed addresses"
      );
      closeEditor();
      load();
    } catch (err) {
      toast.error(err?.message || "Could not save IP restriction");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Flip one user straight from the grid.
   *
   * Turning access off needs addresses to fall back on, so a user with an
   * empty list is sent to the editor instead of being handed a server error.
   */
  const toggleOutsideAccess = useCallback(
    (row) => {
      const next = row?.allow_outside_access === false;
      const list = row?.allowed_ips || [];

      if (!next && list.length === 0) {
        toast("Add an allowed IP first, otherwise this user could not sign in from anywhere.");
        openEditor(row);
        return;
      }

      toast.promise(
        UserIpRestrictionHelper.update(row.user_id, list.join(", "), next).then(
          () => load()
        ),
        {
          loading: "Updating...",
          success: next
            ? "Outside access allowed"
            : "Restricted to allowed addresses",
          error: (err) => err?.message || "Failed to update",
        }
      );
    },
    [load, openEditor]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "employee_name",
        headerName: "Employee",
        flex: 2,
        valueGetter: (params) =>
          params.data?.employee_name || params.data?.username || "-",
      },
      { field: "username", headerName: "Username", flex: 1 },
      {
        field: "store_name",
        headerName: "Store",
        flex: 1,
        valueGetter: (params) => params.data?.store_name || "-",
      },
      {
        field: "designation_name",
        headerName: "Designation",
        flex: 1,
        valueGetter: (params) => params.data?.designation_name || "-",
      },
      {
        field: "allow_outside_access",
        headerName: "Outside Access",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.allow_outside_access === false
            ? { label: "Blocked", colorScheme: "red" }
            : { label: "Allowed", colorScheme: "green" },
      },
      {
        field: "allowed_ips",
        headerName: "Allowed IPs",
        flex: 3,
        valueGetter: (params) =>
          (params.data?.allowed_ips || []).join(", ") || "-",
      },
      {
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        valueGetter: (params) => {
          if (!canManage) return [];
          const row = params.data;
          const isBlocked = row?.allow_outside_access === false;
          return [
            {
              label: isBlocked ? "Allow outside access" : "Block outside access",
              icon: isBlocked ? "fa-solid fa-lock-open" : "fa-solid fa-lock",
              colorScheme: isBlocked ? "green" : "red",
              onClick: () => toggleOutsideAccess(row),
            },
            {
              label: "Edit",
              icon: "fa-solid fa-pen",
              onClick: () => openEditor(row),
            },
          ];
        },
      },
    ],
    [canManage, openEditor, toggleOutsideAccess]
  );

  const restrictedCount = rows.filter(
    (row) => row?.allow_outside_access === false
  ).length;

  // A loopback address is never a real client, so the proxy is at fault
  // rather than the reading being merely unexpected.
  const proxyBroken = ipDiagnostic?.isLoopback === true;

  return (
    <GlobalWrapper title="IP Restrictions" permissionKey={PERMISSION_KEY}>
      <CustomContainer
        title="IP Restrictions"
        filledHeader
        rightSection={
          <HStack spacing={3}>
            <Text fontSize="13px">
              This device: <Code fontSize="13px">{myIp || "unknown"}</Code>
            </Text>
            <Button size="sm" colorScheme="purple" onClick={load}>
              Refresh
            </Button>
          </HStack>
        }
      >
        {proxyBroken ? (
          <Alert
            status="error"
            borderRadius="md"
            marginBottom="12px"
            alignItems="flex-start"
          >
            <AlertIcon />
            <Box fontSize="13px">
              <AlertTitle fontSize="14px">
                Restrictions will not work yet
              </AlertTitle>
              <AlertDescription display="block">
                The API sees every request as coming from{" "}
                <Code fontSize="12px">{myIp}</Code>, which is the server
                talking to itself — not a real network address. Your reverse
                proxy is not sending the client&apos;s IP, so every user looks
                identical and an allow-list here would match all of them.
                Set <Code fontSize="12px">X-Forwarded-For</Code> on the proxy,
                then reload this page and check the address below is your real
                public IP before restricting anyone.
              </AlertDescription>
            </Box>
          </Alert>
        ) : null}

        {!proxyBroken && ipDiagnostic?.isPrivate ? (
          <Alert
            status="warning"
            borderRadius="md"
            marginBottom="12px"
            alignItems="flex-start"
          >
            <AlertIcon />
            <Box fontSize="13px">
              <AlertTitle fontSize="14px">
                Check this address is right
              </AlertTitle>
              <AlertDescription display="block">
                <Code fontSize="12px">{myIp}</Code> is a private network
                address. That is correct if staff reach this app over the
                local network, but if they come in over the internet it means
                the proxy is passing the wrong address along.
              </AlertDescription>
            </Box>
          </Alert>
        ) : null}

        <Flex
          marginBottom="12px"
          fontSize="13px"
          color="gray.600"
          justifyContent="space-between"
          alignItems="center"
          gap="12px"
          flexWrap="wrap"
        >
          <Box>
            Decide per user whether they may sign in from outside their allowed
            addresses. Blocking applies at login and cuts off any session
            already open elsewhere. Addresses stay saved while access is
            allowed, so you can switch a user back without retyping them.
          </Box>
          <Badge colorScheme={restrictedCount > 0 ? "red" : "gray"}>
            {restrictedCount} restricted
          </Badge>
        </Flex>

        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={rows}
            columnDefs={colDefs}
            tableKey="user-ip-restrictions"
            gridOptions={{
              getRowId: (params) => String(params.data?.user_id ?? ""),
            }}
          />
        )}
      </CustomContainer>

      <CustomModal
        isOpen={editing !== null}
        onClose={closeEditor}
        title={`IP access — ${
          editing?.employee_name || editing?.username || ""
        }`}
        size="lg"
        footer={
          <HStack spacing={3}>
            <Button variant="ghost" size="sm" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              size="sm"
              isLoading={saving}
              isDisabled={!allowOutside && draft.trim() === ""}
              onClick={save}
            >
              Save
            </Button>
          </HStack>
        }
      >
        <FormControl
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          marginBottom="16px"
        >
          <Box paddingRight="12px">
            <FormLabel fontSize="14px" marginBottom="2px">
              Allow access from outside
            </FormLabel>
            <Text fontSize="12px" color="gray.600">
              {allowOutside
                ? "This user can sign in from any network."
                : "This user can only sign in from the addresses below."}
            </Text>
          </Box>
          <Switch
            colorScheme="purple"
            isChecked={allowOutside}
            onChange={(event) => setAllowOutside(event.target.checked)}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="14px">Allowed addresses</FormLabel>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="203.0.113.10, 203.0.113.0/24"
            rows={4}
            fontSize="14px"
          />
          <FormHelperText fontSize="12px">
            Comma separated. Each entry can be an exact address
            (203.0.113.10), a CIDR block (203.0.113.0/24), a wildcard
            (203.0.113.*) or a last-octet range (203.0.113.10-20). Kept on
            file even while outside access is allowed.
          </FormHelperText>
        </FormControl>

        <Wrap marginTop="12px" spacing={2}>
          {myIp && !proxyBroken ? (
            <WrapItem>
              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={() =>
                  setDraft((current) =>
                    current.trim() === "" ? myIp : `${current.trim()}, ${myIp}`
                  )
                }
              >
                Add this device&apos;s IP ({myIp})
              </Button>
            </WrapItem>
          ) : null}
          <WrapItem>
            <Button size="xs" variant="ghost" onClick={() => setDraft("")}>
              Clear
            </Button>
          </WrapItem>
        </Wrap>

        {!allowOutside && draft.trim() === "" ? (
          <Text marginTop="12px" fontSize="12px" color="red.500">
            Add at least one address before blocking outside access —
            otherwise this user could not sign in from anywhere.
          </Text>
        ) : null}
      </CustomModal>
    </GlobalWrapper>
  );
}

export default IpRestrictions;
