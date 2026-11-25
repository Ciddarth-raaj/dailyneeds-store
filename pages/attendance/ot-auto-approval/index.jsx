import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, isOk } from "../../../util/attendanceV2";

/**
 * OT AUTO-APPROVAL.
 *
 * One switch and an optional daily cap. ON: every five minutes the system
 * approves pending OT itself, every stage of its chain, with the remark
 * "Auto-approved by the system". OT in a payroll-locked month, OT over the
 * cap, and OT on a date with a correction pending stay with approvers.
 * OFF: OT goes to approvers (with their Telegram card) as before. Switching
 * off undoes nothing already approved.
 */
export default function OtAutoApprovalPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const [cap, setCap] = useState("");

  const apply = (body) => {
    setSaved(body);
    setAutoApprove(Boolean(body.auto_approve));
    setCap(body.max_minutes === null || body.max_minutes === undefined ? "" : String(body.max_minutes));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await AttendanceV2Helper.getOtAutoApproval();
      if (!isOk(body)) {
        setError(apiMessage(body, "The setting could not be loaded"));
        return;
      }
      apply(body);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const capText = cap.trim();
  const capValid = capText === "" || (/^\d+$/.test(capText) && Number(capText) >= 1 && Number(capText) <= 1440);
  const changed =
    saved &&
    (Boolean(saved.auto_approve) !== autoApprove ||
      (saved.max_minutes === null || saved.max_minutes === undefined ? "" : String(saved.max_minutes)) !== capText);

  const save = async () => {
    setSaving(true);
    try {
      const body = await AttendanceV2Helper.saveOtAutoApproval({
        auto_approve: autoApprove,
        max_minutes: capText === "" ? null : Number(capText),
      });
      if (!isOk(body)) {
        toast({ status: "error", title: apiMessage(body, "The setting could not be saved") });
        return;
      }
      apply(body);
      toast({
        status: "success",
        title: body.auto_approve ? "OT auto-approval is ON" : "OT auto-approval is OFF",
        description: "Takes effect within five minutes.",
      });
    } catch (err) {
      toast({ status: "error", title: "Could not reach the server. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalWrapper title="OT Auto-Approval" permissionKey={["manage_ot_auto_approval"]}>
      <CustomContainer title="OT Auto-Approval" filledHeader>
        {loading ? (
          <Flex justify="center" py={8}>
            <Spinner />
          </Flex>
        ) : error ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">{error}</AlertDescription>
          </Alert>
        ) : saved && saved.available === false ? (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">Automatic OT is not set up on this server yet.</AlertDescription>
          </Alert>
        ) : (
          <Stack spacing={5} maxW="560px">
            <Alert status="info" borderRadius="md" alignItems="flex-start">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                When this is <strong>on</strong>, the system approves pending OT by itself every five minutes, with
                the remark &ldquo;Auto-approved by the system&rdquo;. OT in a payroll-locked month, OT over the daily
                cap, and OT on a date with a correction still pending stay with approvers. When it is{" "}
                <strong>off</strong>, OT goes to approvers as before. Turning it off does not undo anything already
                approved.
              </AlertDescription>
            </Alert>

            {saved && saved.automation_enabled === false ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Automatic OT is switched off, so no OT is being raised or approved by the system.
                </AlertDescription>
              </Alert>
            ) : null}

            <FormControl display="flex" alignItems="center">
              <Switch
                id="ot-auto-approve"
                colorScheme="purple"
                isChecked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                mr={3}
              />
              <FormLabel htmlFor="ot-auto-approve" mb={0} fontWeight="600">
                Auto-approve OT
              </FormLabel>
            </FormControl>

            <FormControl isInvalid={!capValid} isDisabled={!autoApprove}>
              <FormLabel fontSize="sm">Daily cap (minutes)</FormLabel>
              <Input
                size="sm"
                maxW="200px"
                inputMode="numeric"
                placeholder="No cap"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
              />
              <FormHelperText fontSize="xs">
                {capValid
                  ? "Leave empty to approve any amount. OT longer than the cap stays with approvers."
                  : "Enter whole minutes from 1 to 1440, or leave empty."}
              </FormHelperText>
            </FormControl>

            <Flex align="center" gap={3}>
              <Button colorScheme="purple" size="sm" onClick={save} isLoading={saving} isDisabled={!changed || !capValid}>
                Save
              </Button>
              {saved && saved.updated_at ? (
                <Text fontSize="xs" color="gray.500">
                  Last changed {saved.updated_at}
                  {saved.updated_by_employee_id ? ` by employee ${saved.updated_by_employee_id}` : ""}
                </Text>
              ) : null}
            </Flex>
          </Stack>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
