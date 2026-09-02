import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
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
 * Static IP restriction admin screen.
 *
 * A user with no entries can sign in from anywhere. Once entries are saved,
 * that account only works from those addresses — both at login and for any
 * session already open.
 */
function IpRestrictions() {
  const canManage = usePermissions(PERMISSION_KEY);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myIp, setMyIp] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
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
      .then(setMyIp)
      .catch(() => setMyIp(""));
  }, [load]);

  const openEditor = useCallback((row) => {
    setEditing(row);
    setDraft((row?.allowed_ips || []).join(", "));
  }, []);

  const closeEditor = () => {
    setEditing(null);
    setDraft("");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await UserIpRestrictionHelper.update(editing.user_id, draft);
      toast.success(
        draft.trim() === ""
          ? "IP restriction removed"
          : "IP restriction updated"
      );
      closeEditor();
      load();
    } catch (err) {
      toast.error(err?.message || "Could not save IP restriction");
    } finally {
      setSaving(false);
    }
  };

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
        field: "is_restricted",
        headerName: "Access",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_restricted
            ? { label: "Restricted", colorScheme: "purple" }
            : { label: "Any network", colorScheme: "gray" },
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
          return [
            {
              label: "Edit",
              icon: "fa-solid fa-pen",
              onClick: () => openEditor(params.data),
            },
          ];
        },
      },
    ],
    [canManage, openEditor]
  );

  return (
    <GlobalWrapper title="IP Restrictions" permissionKey={PERMISSION_KEY}>
      <CustomContainer
        title="IP Restrictions"
        filledHeader
        rightSection={
          <HStack spacing={3}>
            <Text fontSize="13px">
              This device:{" "}
              <Code fontSize="13px">{myIp || "unknown"}</Code>
            </Text>
            <Button size="sm" colorScheme="purple" onClick={load}>
              Refresh
            </Button>
          </HStack>
        }
      >
        <Box marginBottom="12px" fontSize="13px" color="gray.600">
          Leave a user&apos;s list empty to let them sign in from anywhere. Add
          one or more addresses to lock the account to those networks — this
          applies at login and cuts off any session already open elsewhere.
        </Box>

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
        title={`Allowed IPs — ${
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
              onClick={save}
            >
              Save
            </Button>
          </HStack>
        }
      >
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
            (203.0.113.*) or a last-octet range (203.0.113.10-20). Leave blank
            to remove the restriction.
          </FormHelperText>
        </FormControl>

        <Wrap marginTop="12px" spacing={2}>
          {myIp ? (
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

        <Flex marginTop="12px">
          <Badge colorScheme={draft.trim() === "" ? "gray" : "purple"}>
            {draft.trim() === ""
              ? "Can sign in from any network"
              : "Restricted to the addresses above"}
          </Badge>
        </Flex>
      </CustomModal>
    </GlobalWrapper>
  );
}

export default IpRestrictions;
