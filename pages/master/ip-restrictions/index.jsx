import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import AgGrid from "../../../components/AgGrid";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import {
  ClientIpAlerts,
  IpAllowListEditor,
  ThisDevice,
} from "../../../components/IpAllowList";
import UserIpRestrictionHelper from "../../../helper/userIpRestriction";
import useMyIp from "../../../customHooks/useMyIp";
import usePermissions from "../../../customHooks/usePermissions";
import {
  IP_POLICIES,
  IP_POLICY_OPTIONS,
  policyBadge,
} from "../../../constants/ipPolicies";

const PERMISSION_KEY = "manage_ip_restrictions";

/**
 * Per-user IP policy, under Masters → Branch and Restrictions.
 *
 * Each login has one of three policies. `branch` (the default) follows
 * whatever rule the user's branch has — set on the Branches page. `custom`
 * enforces the user's own addresses, plus the branch's while that is
 * restricted. `unrestricted` is an explicit exemption; admins default to it.
 *
 * The Effective column is what the API actually enforces right now, with
 * both layers folded together, so an admin can see at a glance who is open
 * and who is confined without working the rule out by hand.
 */
function IpRestrictions() {
  const canManage = usePermissions(PERMISSION_KEY);
  const { myIp, ipDiagnostic, proxyBroken } = useMyIp();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [policy, setPolicy] = useState("branch");
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
  }, [load]);

  const openEditor = useCallback((row) => {
    setEditing(row);
    setDraft((row?.allowed_ips || []).join(", "));
    setPolicy(IP_POLICIES[row?.ip_policy] ? row.ip_policy : "branch");
  }, []);

  const closeEditor = () => {
    setEditing(null);
    setDraft("");
    setPolicy("branch");
  };

  const emptyCustom = policy === "custom" && draft.trim() === "";

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await UserIpRestrictionHelper.update(editing.user_id, draft, policy);
      toast.success(`Policy saved: ${IP_POLICIES[policy].label}`);
      closeEditor();
      load();
    } catch (err) {
      toast.error(err?.message || "Could not save IP policy");
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
        headerName: "Branch",
        flex: 1.5,
        valueGetter: (params) => {
          const name = params.data?.store_name || "-";
          return params.data?.branch_enabled ? `${name} (restricted)` : name;
        },
      },
      {
        field: "designation_name",
        headerName: "Designation",
        flex: 1,
        valueGetter: (params) => params.data?.designation_name || "-",
      },
      {
        field: "ip_policy",
        headerName: "Policy",
        type: "badge-column",
        valueGetter: (params) => policyBadge(params.data?.ip_policy),
      },
      {
        field: "effective",
        headerName: "Effective",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.effective?.exempt === false
            ? { label: "Restricted", colorScheme: "red" }
            : { label: "Open", colorScheme: "green" },
      },
      {
        field: "allowed_ips",
        headerName: "Own addresses",
        flex: 2.5,
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

  const restrictedCount = rows.filter(
    (row) => row?.effective?.exempt === false
  ).length;

  const branchAlsoApplies =
    policy === "custom" &&
    editing?.branch_enabled &&
    (editing?.branch_ips || []).length > 0;

  return (
    <GlobalWrapper title="IP Restrictions" permissionKey={PERMISSION_KEY}>
      <CustomContainer
        title="IP Restrictions"
        filledHeader
        rightSection={
          <HStack spacing={3}>
            <ThisDevice myIp={myIp} />
            <Button size="sm" colorScheme="purple" onClick={load}>
              Refresh
            </Button>
          </HStack>
        }
      >
        <ClientIpAlerts myIp={myIp} ipDiagnostic={ipDiagnostic} />

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
            Each user follows their branch&apos;s rule unless given a policy of
            their own here. Branch addresses are managed on the{" "}
            <Link href="/master/branch" passHref>
              <a style={{ textDecoration: "underline" }}>Branches</a>
            </Link>{" "}
            page. Restrictions apply at login and cut off any session already
            open elsewhere.
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
        title={`IP policy — ${
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
              isDisabled={emptyCustom}
              onClick={save}
            >
              Save
            </Button>
          </HStack>
        }
      >
        <FormControl marginBottom="16px">
          <FormLabel fontSize="14px">Policy</FormLabel>
          <Select
            value={policy}
            onChange={(event) => setPolicy(event.target.value)}
            fontSize="14px"
          >
            {IP_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Text marginTop="6px" fontSize="12px" color="gray.600">
            {IP_POLICIES[policy].help}
          </Text>
          {editing?.store_name ? (
            <Text marginTop="4px" fontSize="12px" color="gray.600">
              Branch: {editing.store_name}
              {editing.branch_enabled ? " — currently restricted" : " — not restricted"}
            </Text>
          ) : null}
        </FormControl>

        <IpAllowListEditor
          value={draft}
          onChange={setDraft}
          myIp={myIp}
          proxyBroken={proxyBroken}
          label="Own addresses"
          helperText="Enforced only under Custom addresses; kept on file otherwise."
        />

        {branchAlsoApplies ? (
          <Text marginTop="12px" fontSize="12px" color="gray.600">
            Also allowed from the branch&apos;s addresses:{" "}
            <Code fontSize="12px">{editing.branch_ips.join(", ")}</Code>
          </Text>
        ) : null}

        {emptyCustom ? (
          <Text marginTop="12px" fontSize="12px" color="red.500">
            Add at least one address for a custom policy — otherwise this user
            could not sign in from anywhere.
          </Text>
        ) : null}
      </CustomModal>
    </GlobalWrapper>
  );
}

export default IpRestrictions;
