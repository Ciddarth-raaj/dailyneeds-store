import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Switch,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import CustomContainer from "../CustomContainer";
import OutletHelper from "../../helper/outlets";
import useMyIp from "../../customHooks/useMyIp";
import {
  ClientIpAlerts,
  IpAllowListEditor,
  ThisDevice,
} from "../IpAllowList";

/**
 * The IP Access section of the branch form.
 *
 * Deliberately not part of the Formik form around it. The branch form posts
 * to an endpoint that needs no token, so anything inside it could be set by
 * anyone who can reach the page; this section keeps its own state, loads
 * from the permission-gated rule endpoint, and saves through it separately.
 *
 * Only mounted for holders of `manage_ip_restrictions` — the API answers
 * 403 otherwise, and the app treats any 403 as a dead session.
 */
export default function BranchIpAccessSection({ outletId, editable }) {
  const { myIp, ipDiagnostic, proxyBroken } = useMyIp();

  const [enabled, setEnabled] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState({ enabled: false, draft: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!outletId) return;
    setLoading(true);
    OutletHelper.getIpRestriction(outletId)
      .then((rule) => {
        const next = {
          enabled: rule?.ip_restriction_enabled === true,
          draft: (rule?.allowed_ips || []).join(", "),
        };
        setEnabled(next.enabled);
        setDraft(next.draft);
        setSaved(next);
      })
      .catch((err) => toast.error(err?.message || "Could not load the branch IP rule"))
      .finally(() => setLoading(false));
  }, [outletId]);

  useEffect(() => {
    load();
  }, [load]);

  const emptyWhileOn = enabled && draft.trim() === "";
  const dirty = enabled !== saved.enabled || draft.trim() !== saved.draft.trim();

  const save = async () => {
    setSaving(true);
    try {
      const result = await OutletHelper.updateIpRestriction(outletId, draft, enabled);
      const next = {
        enabled: result.ip_restriction_enabled === true,
        draft: (result.allowed_ips || []).join(", "),
      };
      setEnabled(next.enabled);
      setDraft(next.draft);
      setSaved(next);
      toast.success(
        next.enabled
          ? "Employees of this branch are now restricted to these addresses"
          : "Branch IP restriction is off"
      );
    } catch (err) {
      toast.error(err?.message || "Could not save the branch IP rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomContainer
      title="IP Access"
      smallHeader
      filledHeader
      style={{ marginBottom: "22px" }}
      rightSection={<ThisDevice myIp={myIp} />}
    >
      <ClientIpAlerts myIp={myIp} ipDiagnostic={ipDiagnostic} />

      <FormControl
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="16px"
      >
        <Box paddingRight="12px">
          <FormLabel fontSize="14px" marginBottom="2px">
            Restrict employees to these addresses
          </FormLabel>
          <Text fontSize="12px" color="gray.600">
            Every employee assigned to this branch can then sign in only from
            the addresses below. Admins are not affected. Applies at login and
            cuts off any session already open elsewhere.
          </Text>
        </Box>
        <Switch
          colorScheme="purple"
          isChecked={enabled}
          isDisabled={!editable || loading}
          onChange={(event) => setEnabled(event.target.checked)}
        />
      </FormControl>

      <IpAllowListEditor
        value={draft}
        onChange={setDraft}
        myIp={myIp}
        proxyBroken={proxyBroken}
        isDisabled={!editable || loading}
        label="Branch addresses"
        helperText="Kept on file while the restriction is off."
      />

      {emptyWhileOn ? (
        <Text marginTop="12px" fontSize="12px" color="red.500">
          Add at least one address before restricting — otherwise nobody at
          this branch could sign in from anywhere.
        </Text>
      ) : null}

      {editable ? (
        <Flex marginTop="16px" justifyContent="flex-end">
          <HStack spacing={3}>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={!dirty || saving}
              onClick={() => {
                setEnabled(saved.enabled);
                setDraft(saved.draft);
              }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              colorScheme="purple"
              isLoading={saving}
              isDisabled={loading || !dirty || emptyWhileOn}
              onClick={save}
            >
              Save IP access
            </Button>
          </HStack>
        </Flex>
      ) : null}
    </CustomContainer>
  );
}
