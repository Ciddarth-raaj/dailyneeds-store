import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import Table from "../../../components/table/table";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import AttendanceHelper from "../../../helper/attendance";
import { toApiDateTime } from "../../../components/attendance/DeviceForm";
import { displayDateTime } from "../../../util/attendanceRaw";

/**
 * One Biomax device: details, its location history, its event history, and
 * the four actions an administrator has.
 *
 *   Move        close the current period at a time and open a new one
 *               elsewhere from that same instant
 *   Deactivate  close the current period with no successor (a broken unit;
 *               its replacement is added as a NEW device)
 *   Reactivate  open a new period from a time
 *   Correct Cloud ID  a genuine typo only, with a reason, audited, and
 *               refused once the device has punched
 *
 * Closing a period before the device's latest punch would quarantine punches
 * that were valid when they happened; the server asks for an explicit
 * confirmation and this page shows that question rather than hiding it.
 *
 * The Cloud ID is not an editable field here. Label and notes are.
 */
export default function BiomaxDevicePage() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const canManage = usePermissions(["manage_biomax_devices"]);
  const { outlets } = useOutlets({ directory: true });

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({ label: "", notes: "" });
  const [modal, setModal] = useState(null); // 'move' | 'deactivate' | 'reactivate' | 'correct'
  const [form, setForm] = useState({ outlet_id: "", at: "", note: "", dev_id: "", reason: "" });
  const [confirm, setConfirm] = useState(null); // {message, last_punch_at}
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await AttendanceHelper.getDevice(id);
      if (res && res.code === 200) {
        setDevice(res.data);
        setDetails({ label: res.data.label || "", notes: res.data.notes || "" });
        setError(null);
      } else {
        setError((res && res.msg) || "Device not found");
      }
    } catch (err) {
      console.log(err);
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (kind) => {
    setForm({ outlet_id: "", at: "", note: "", dev_id: "", reason: "" });
    setConfirm(null);
    setModal(kind);
  };

  const run = async (withConfirm = false) => {
    setBusy(true);
    try {
      let res;
      const body = { biomax_device_id: Number(id) };
      if (modal === "move" || modal === "reactivate") {
        res = await AttendanceHelper.assignDevice({ ...body, outlet_id: Number(form.outlet_id), effective_from: toApiDateTime(form.at), note: form.note, confirm_before_last_punch: withConfirm });
      } else if (modal === "deactivate") {
        res = await AttendanceHelper.deactivateDevice({ ...body, effective_to: toApiDateTime(form.at), note: form.note, confirm_before_last_punch: withConfirm });
      } else if (modal === "correct") {
        res = await AttendanceHelper.correctCloudId({ ...body, dev_id: form.dev_id.trim(), reason: form.reason });
      }
      if (res && res.code === 200) {
        toast({ title: "Saved", status: "success", duration: 3000 });
        setModal(null);
        await load();
      } else if (res && res.needs_confirmation) {
        setConfirm({ message: res.msg, last_punch_at: res.last_punch_at });
      } else {
        toast({ title: (res && res.msg) || "Could not save", status: "error", duration: 6000 });
      }
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    setBusy(true);
    try {
      const res = await AttendanceHelper.updateDeviceDetails({ biomax_device_id: Number(id), label: details.label.trim(), notes: details.notes });
      if (res && res.code === 200) {
        toast({ title: "Details saved", status: "success", duration: 3000 });
        await load();
      } else {
        toast({ title: (res && res.msg) || "Could not save", status: "error", duration: 6000 });
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <GlobalWrapper title="Biomax Device" permissionKey={["view_biomax_devices"]}>
        <Stack align="center" py={10}><Spinner color="purple.500" /></Stack>
      </GlobalWrapper>
    );
  }
  if (error || !device) {
    return (
      <GlobalWrapper title="Biomax Device" permissionKey={["view_biomax_devices"]}>
        <Alert status="error" fontSize="sm"><AlertIcon />{error || "Device not found"}</Alert>
      </GlobalWrapper>
    );
  }

  const isActive = device.status === "ACTIVE";
  const assignmentRows = (device.assignments || []).map((a) => ({
    location: a.outlet_name || a.outlet_id,
    effective_from: displayDateTime(a.effective_from),
    effective_to: a.effective_to ? displayDateTime(a.effective_to) : "open",
    note: a.note || "",
  }));
  const eventRows = (device.events || []).map((e) => ({
    when: displayDateTime(e.created_at),
    event: e.event_type,
    detail: e.detail ? JSON.stringify(e.detail) : "",
    by: e.actor_name || (e.actor_employee_id ? `#${e.actor_employee_id}` : "system"),
  }));

  return (
    <GlobalWrapper title={device.label} permissionKey={["view_biomax_devices"]}>
      <CustomContainer
        title={device.label}
        subtitle={<span>Cloud ID <span style={{ fontFamily: "monospace" }}>{device.dev_id}</span></span>}
        filledHeader
        rightSection={
          <Stack direction="row" spacing={2} align="center">
            <Badge colorScheme={isActive ? "green" : "gray"}>{isActive ? "Active" : "Inactive"}</Badge>
            {canManage && isActive ? <Button size="sm" variant="outline" colorScheme="purple" onClick={() => open("move")}>Move</Button> : null}
            {canManage && isActive ? <Button size="sm" variant="outline" colorScheme="red" onClick={() => open("deactivate")}>Deactivate</Button> : null}
            {canManage && !isActive ? <Button size="sm" colorScheme="purple" onClick={() => open("reactivate")}>Reactivate</Button> : null}
          </Stack>
        }
      >
        <Stack spacing={1} fontSize="sm">
          <Text><b>Current location:</b> {device.current_assignment ? `${device.current_assignment.outlet_name} since ${displayDateTime(device.current_assignment.effective_from)}` : "none (inactive)"}</Text>
          <Text><b>First seen:</b> {displayDateTime(device.first_seen_at) || "-"} · <b>Last seen:</b> {displayDateTime(device.last_seen_at) || "-"} · <b>Last punch:</b> {displayDateTime(device.last_punch_at) || "-"}</Text>
        </Stack>

        <Stack spacing={3} mt={5} maxW="560px">
          <FormControl isDisabled={!canManage}>
            <FormLabel>Device Label</FormLabel>
            <Input value={details.label} onChange={(e) => setDetails((d) => ({ ...d, label: e.target.value }))} />
          </FormControl>
          <FormControl isDisabled={!canManage}>
            <FormLabel>Notes</FormLabel>
            <Textarea rows={2} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))} />
          </FormControl>
          {canManage ? (
            <Stack direction="row" spacing={3}>
              <Button size="sm" colorScheme="purple" onClick={saveDetails} isLoading={busy}>Save details</Button>
              <Button size="sm" variant="ghost" onClick={() => open("correct")}>Correct Cloud ID…</Button>
            </Stack>
          ) : null}
        </Stack>
      </CustomContainer>

      <CustomContainer title="Location history" subtitle="Every period this terminal has been assigned to a location. Periods are closed, never edited or deleted." filledHeader>
        <Table
          heading={{ location: "Location", effective_from: "Effective From", effective_to: "Effective To", note: "Note" }}
          rows={assignmentRows}
          size="sm"
        />
      </CustomContainer>

      <CustomContainer title="Device history" subtitle="Who changed what, and when." filledHeader>
        <Table heading={{ when: "When", event: "Event", detail: "Detail", by: "By" }} rows={eventRows} size="sm" />
      </CustomContainer>

      <CustomModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal === "move" ? "Move device" :
          modal === "deactivate" ? "Deactivate device" :
          modal === "reactivate" ? "Reactivate device" :
          "Correct Cloud ID"
        }
        footer={
          <Stack direction="row" spacing={3}>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            {confirm ? (
              <Button colorScheme="red" onClick={() => run(true)} isLoading={busy}>Yes, do it anyway</Button>
            ) : (
              <Button colorScheme="purple" onClick={() => run(false)} isLoading={busy}>Save</Button>
            )}
          </Stack>
        }
      >
        <Stack spacing={4}>
          {confirm ? (
            <Alert status="warning" fontSize="sm"><AlertIcon />{confirm.message}</Alert>
          ) : null}
          {modal === "move" || modal === "reactivate" ? (
            <FormControl isRequired>
              <FormLabel>{modal === "move" ? "New location" : "Location"}</FormLabel>
              <Select value={form.outlet_id} onChange={(e) => setForm((f) => ({ ...f, outlet_id: e.target.value }))} placeholder="Choose an outlet">
                {outlets.map((o) => (<option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>))}
              </Select>
            </FormControl>
          ) : null}
          {modal !== "correct" ? (
            <FormControl isRequired>
              <FormLabel>{modal === "deactivate" ? "Effective To" : "Effective From"}</FormLabel>
              <Input type="datetime-local" value={form.at} onChange={(e) => setForm((f) => ({ ...f, at: e.target.value }))} />
              <FormHelperText>
                {modal === "move"
                  ? "The current period closes at this time and the new one starts from it. Earlier punches keep their old location."
                  : modal === "deactivate"
                  ? "The current period closes at this time. Punches after it are held as inactive-device until reactivated. A replacement unit is added as a new device."
                  : "A new period starts from this time. Punches in the gap stay held as inactive-device."}
              </FormHelperText>
            </FormControl>
          ) : null}
          {modal === "correct" ? (
            <>
              <Alert status="info" fontSize="sm"><AlertIcon />Only for a mistyped Cloud ID. Refused once this device has sent any punch; in that case add the correct Cloud ID as a new device and deactivate this one.</Alert>
              <FormControl isRequired>
                <FormLabel>Correct Cloud ID</FormLabel>
                <Input fontFamily="mono" value={form.dev_id} onChange={(e) => setForm((f) => ({ ...f, dev_id: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Reason</FormLabel>
                <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </FormControl>
            </>
          ) : (
            <FormControl>
              <FormLabel>Note</FormLabel>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </FormControl>
          )}
        </Stack>
      </CustomModal>
    </GlobalWrapper>
  );
}
