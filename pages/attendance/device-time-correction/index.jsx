import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AttendanceHelper from "../../../helper/attendance";
import { useUser } from "../../../contexts/UserContext";
import {
  EMPTY_FORM,
  STATUS_COLOR,
  buildApplyBody,
  buildCriteriaBody,
  canRevert,
  clockOf,
  offsetLabel,
  refusalMessage,
} from "../../../util/deviceTimeCorrection";

/**
 * Attendance -> Device Time Correction. ADMINISTRATORS ONLY.
 *
 * For the case where an attendance terminal's clock was wrong for a period:
 * people punched at the right moment and the device stamped the wrong time.
 *
 *   1. PREVIEW  - the server lists every punch the criteria select (this
 *                 date, this device, this device-clock window, this outlet)
 *                 and what each becomes. Nothing is written.
 *   2. APPLY    - sends the SAME criteria with the batch ID and fingerprint
 *                 the preview issued. The server refuses it if the punches
 *                 changed since, if any affected payroll month is locked, or
 *                 if the batch was already applied; otherwise the correction
 *                 and the recalculated attendance commit together.
 *   3. REVERT   - from the history below; restores the original device time
 *                 and recalculates, keeping the whole audit trail.
 *
 * The raw Biomax punch is never edited. The offset is never defaulted: the
 * administrator types the confirmed real-time difference.
 *
 * The page opens behind `manage_biomax_devices` (the device-administration
 * key, granted to no designation) and then shows its controls to
 * `user_type` 2 only. The SERVER is the boundary: every route checks
 * `user_type` 2 on the token and nothing grantable.
 */
export default function DeviceTimeCorrectionPage() {
  const { userConfig } = useUser();
  const isAdmin = String(userConfig && userConfig.userType) === "2";

  const [options, setOptions] = useState({ devices: [], reason_codes: [] });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewBody, setPreviewBody] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null); // "PREVIEW" | "APPLY" | "REVERT"
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState([]);
  const [reverting, setReverting] = useState(null);
  const [revertReason, setRevertReason] = useState("");
  const [viewing, setViewing] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await AttendanceHelper.listDeviceTimeCorrections({ limit: 50 });
      setHistory(res && res.code === 200 && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    AttendanceHelper.getDeviceTimeCorrectionOptions()
      .then((res) => {
        if (res && res.code === 200) setOptions({ devices: res.devices || [], reason_codes: res.reason_codes || [] });
      })
      .catch(() => setError("Could not load the device list"));
    loadHistory();
  }, [isAdmin, loadHistory]);

  // ANY change to the criteria discards the preview: Apply must always be of
  // exactly what was last previewed.
  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === "biomax_device_id" ? { outlet_id: "" } : {}) }));
    setPreview(null);
    setPreviewBody(null);
    setApplied(null);
  };

  const device = useMemo(
    () => options.devices.find((d) => String(d.biomax_device_id) === String(form.biomax_device_id)) || null,
    [options.devices, form.biomax_device_id]
  );
  const deviceOutlets = useMemo(() => {
    if (!device) return [];
    const seen = new Map();
    (device.assignments || []).forEach((a) => {
      if (!seen.has(a.outlet_id)) seen.set(a.outlet_id, a.outlet_name || `Outlet ${a.outlet_id}`);
    });
    return [...seen.entries()].map(([outlet_id, outlet_name]) => ({ outlet_id, outlet_name }));
  }, [device]);

  const runPreview = async () => {
    setError(null);
    setApplied(null);
    const built = buildCriteriaBody(form);
    if (built.error) {
      setError(built.error);
      return;
    }
    setBusy("PREVIEW");
    try {
      const res = await AttendanceHelper.previewDeviceTimeCorrection(built.body);
      if (!res || res.code !== 200) {
        setPreview(null);
        setError(refusalMessage(res, "The preview could not be produced"));
        return;
      }
      setPreview(res);
      setPreviewBody(built.body);
    } catch (err) {
      setError("Could not reach the server");
    } finally {
      setBusy(null);
    }
  };

  const runApply = async () => {
    const body = buildApplyBody(previewBody, preview);
    if (!body) return;
    setConfirming(false);
    setError(null);
    setBusy("APPLY");
    try {
      const res = await AttendanceHelper.applyDeviceTimeCorrection(body);
      if (!res || res.code !== 200) {
        setError(refusalMessage(res, "The correction was not applied"));
        return;
      }
      setApplied(res);
      setPreview(null);
      setPreviewBody(null);
      await loadHistory();
    } catch (err) {
      setError("Could not reach the server. Check the history below before trying again.");
    } finally {
      setBusy(null);
    }
  };

  const runRevert = async () => {
    if (!reverting) return;
    setBusy("REVERT");
    setError(null);
    try {
      const res = await AttendanceHelper.revertDeviceTimeCorrection(
        reverting.attendance_device_time_correction_id,
        revertReason.trim()
      );
      if (!res || res.code !== 200) {
        setError(refusalMessage(res, "The correction was not reverted"));
        return;
      }
      setApplied(res);
      setReverting(null);
      setRevertReason("");
      await loadHistory();
    } catch (err) {
      setError("Could not reach the server");
    } finally {
      setBusy(null);
    }
  };

  const openDetail = async (row) => {
    try {
      const res = await AttendanceHelper.getDeviceTimeCorrection(row.attendance_device_time_correction_id);
      setViewing(res && res.code === 200 ? res.data : null);
    } catch (err) {
      setError("Could not load the correction");
    }
  };

  if (!isAdmin) {
    return (
      <GlobalWrapper title="Device Time Correction" permissionKey={["manage_biomax_devices"]}>
        <CustomContainer title="Device Time Correction" filledHeader>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Device Time Correction is available to administrators only.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const summary = preview ? preview.summary : null;

  return (
    <GlobalWrapper title="Device Time Correction" permissionKey={["manage_biomax_devices"]}>
      <CustomContainer title="Device Time Correction" filledHeader>
        <Stack spacing={4}>
          <Text fontSize="sm" color="gray.600">
            For punches an attendance machine stamped while its clock was wrong. Only punches matching the date, the device,
            the device-clock time window and (if chosen) the outlet are corrected. The original Biomax time is kept; the
            corrected time is used for attendance while the correction is active.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Date</FormLabel>
              <Input type="date" size="sm" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Device / attendance machine</FormLabel>
              <Select size="sm" placeholder="Choose device" value={form.biomax_device_id} onChange={(e) => setField("biomax_device_id", e.target.value)}>
                {options.devices.map((d) => (
                  <option key={d.biomax_device_id} value={d.biomax_device_id}>
                    {d.label} — {d.dev_id}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Outlet / location</FormLabel>
              <Select size="sm" placeholder="Wherever the device was" value={form.outlet_id} onChange={(e) => setField("outlet_id", e.target.value)} isDisabled={!device}>
                {deviceOutlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Reason</FormLabel>
              <Select size="sm" value={form.reason_code} onChange={(e) => setField("reason_code", e.target.value)}>
                {options.reason_codes.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Affected From (device time)</FormLabel>
              <Input type="time" step="1" size="sm" value={form.from_time} onChange={(e) => setField("from_time", e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Affected To (device time)</FormLabel>
              <Input type="time" step="1" size="sm" value={form.to_time} onChange={(e) => setField("to_time", e.target.value)} />
              <FormHelperText fontSize="xs">Both ends inclusive. End before the clock was fixed.</FormHelperText>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Correction offset (minutes)</FormLabel>
              <Input type="number" step="1" size="sm" placeholder="e.g. 150 or -30" value={form.offset_minutes} onChange={(e) => setField("offset_minutes", e.target.value)} />
              <FormHelperText fontSize="xs">{form.offset_minutes !== "" ? offsetLabel(form.offset_minutes) : "Real time minus device time. Never guessed."}</FormHelperText>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Remarks</FormLabel>
              <Textarea size="sm" rows={2} placeholder="How the offset was established" value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} />
            </FormControl>
          </SimpleGrid>

          <Flex gap={2}>
            <Button size="sm" colorScheme="purple" onClick={runPreview} isLoading={busy === "PREVIEW"} loadingText="Previewing">
              Preview
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              onClick={() => setConfirming(true)}
              isDisabled={!preview || !preview.can_apply || busy !== null}
              isLoading={busy === "APPLY"}
              loadingText="Applying"
            >
              Apply Correction
            </Button>
          </Flex>

          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert>
          ) : null}
          {applied ? (
            <Alert status="success" fontSize="sm" borderRadius="md"><AlertIcon />{applied.msg}</Alert>
          ) : null}

          {preview ? (
            <Box borderWidth="1px" borderRadius="md" p={3}>
              <Text fontWeight="600" fontSize="sm" mb={2}>Preview — nothing has been changed yet</Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                <Stat label="Punches affected" value={summary.punch_count} />
                <Stat label="Employees affected" value={summary.employee_count} />
                <Stat label="Device" value={`${summary.device.label} (${summary.device.dev_id})`} />
                <Stat label="Outlet" value={summary.outlet ? summary.outlet.outlet_name : (summary.outlets_seen || []).join(", ") || "—"} />
                <Stat label="Earliest original" value={clockOf(summary.earliest_original)} />
                <Stat label="Earliest corrected" value={clockOf(summary.earliest_corrected)} />
                <Stat label="Latest original" value={clockOf(summary.latest_original)} />
                <Stat label="Latest corrected" value={clockOf(summary.latest_corrected)} />
              </SimpleGrid>
              <Text fontSize="xs" color="gray.600" mt={2}>Offset {offsetLabel(summary.offset_minutes)} · batch ID {preview.batch_ref}</Text>

              {(preview.blocking_issues || []).map((b) => (
                <Alert key={b.code} status="error" fontSize="sm" borderRadius="md" mt={2}>
                  <AlertIcon /><AlertDescription>{b.msg}</AlertDescription>
                </Alert>
              ))}
              {(preview.warnings || []).map((w) => (
                <Alert key={w.code} status="warning" fontSize="sm" borderRadius="md" mt={2}>
                  <AlertIcon /><AlertDescription>{w.msg}</AlertDescription>
                </Alert>
              ))}

              <Box overflowX="auto" mt={3}>
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Employee ID</Th>
                      <Th>Employee Name</Th>
                      <Th>Original Punch</Th>
                      <Th>Corrected Punch</Th>
                      <Th>Device</Th>
                      <Th>Outlet</Th>
                      <Th>Received By Server</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {preview.punches.map((p) => (
                      <Tr key={p.biomax_punch_id} bg={p.crosses_date || p.already_corrected_by ? "red.50" : undefined}>
                        <Td fontSize="xs">{p.employee_id || p.employee_code}</Td>
                        <Td fontSize="xs">
                          {p.employee_name || <Text as="span" color="gray.500">Unmatched code {p.employee_code}</Text>}
                          {p.voided ? <Badge ml={1} fontSize="9px">VOIDED</Badge> : null}
                        </Td>
                        <Td fontSize="xs" whiteSpace="nowrap">{p.original_punch}</Td>
                        <Td fontSize="xs" whiteSpace="nowrap" fontWeight="600">{p.corrected_punch}</Td>
                        <Td fontSize="xs">{p.device}</Td>
                        <Td fontSize="xs">{p.outlet || "—"}</Td>
                        <Td fontSize="xs" whiteSpace="nowrap" color="gray.600">{p.received_at || "—"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          ) : null}
        </Stack>
      </CustomContainer>

      <CustomContainer title="Device Time Corrections" filledHeader smallHeader style={{ marginTop: 16 }}>
        {history.length === 0 ? (
          <Text fontSize="sm" color="gray.600">No device time corrections yet.</Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Device</Th>
                  <Th>Outlet</Th>
                  <Th>Window (device time)</Th>
                  <Th>Offset</Th>
                  <Th isNumeric>Punches</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Applied</Th>
                  <Th>Reverted</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {history.map((h) => (
                  <Tr key={h.attendance_device_time_correction_id}>
                    <Td fontSize="xs">{h.attendance_device_time_correction_id}</Td>
                    <Td fontSize="xs" whiteSpace="nowrap">{h.correction_date}</Td>
                    <Td fontSize="xs">{h.device_label || h.dev_id}</Td>
                    <Td fontSize="xs">{h.outlet_name || "Any"}</Td>
                    <Td fontSize="xs" whiteSpace="nowrap">{clockOf(h.window_from)} – {clockOf(h.window_to)}</Td>
                    <Td fontSize="xs" whiteSpace="nowrap">{offsetLabel(h.offset_minutes)}</Td>
                    <Td fontSize="xs" isNumeric>{h.punch_count} <Text as="span" color="gray.500">({h.employee_count} emp)</Text></Td>
                    <Td fontSize="xs">{h.reason_label}<Text color="gray.500">{h.remarks}</Text></Td>
                    <Td><Badge colorScheme={STATUS_COLOR[h.status] || "gray"} fontSize="10px">{h.status}</Badge></Td>
                    <Td fontSize="xs">{h.applied_by_name || h.applied_by_employee_id || "—"}<Text color="gray.500">{h.applied_at}</Text></Td>
                    <Td fontSize="xs">
                      {h.reverted_at ? (
                        <>
                          {h.reverted_by_name || h.reverted_by_employee_id}
                          <Text color="gray.500">{h.reverted_at}</Text>
                          <Text color="gray.500">{h.revert_reason}</Text>
                        </>
                      ) : "—"}
                    </Td>
                    <Td>
                      <Flex gap={1}>
                        <Button size="xs" variant="outline" onClick={() => openDetail(h)}>Punches</Button>
                        {canRevert(h) ? (
                          <Button size="xs" variant="outline" colorScheme="red" onClick={() => { setReverting(h); setRevertReason(""); }}>
                            Revert
                          </Button>
                        ) : null}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </CustomContainer>

      {/* ------------------------------------------------ confirm apply */}
      <Modal isOpen={confirming} onClose={() => setConfirming(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Apply device time correction?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {summary ? (
              <Text fontSize="sm">
                {summary.punch_count} punch(es) of {summary.employee_count} employee(s) from {summary.device.label} on{" "}
                {previewBody && previewBody.date} will use a time {offsetLabel(summary.offset_minutes)}. Attendance for every affected
                employee is recalculated. The original device times are kept, and the correction can be reverted while the
                payroll month is unlocked.
              </Text>
            ) : null}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button size="sm" colorScheme="red" onClick={runApply}>Apply Correction</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ------------------------------------------------ revert */}
      <Modal isOpen={!!reverting} onClose={() => setReverting(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Revert Device Time Correction #{reverting && reverting.attendance_device_time_correction_id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={3}>
              The {reverting && reverting.punch_count} punch(es) will use their original device time again and the affected
              employees are recalculated. The correction stays in the history, marked REVERTED.
            </Text>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Reason for reverting</FormLabel>
              <Textarea size="sm" value={revertReason} onChange={(e) => setRevertReason(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setReverting(null)}>Cancel</Button>
            <Button size="sm" colorScheme="red" onClick={runRevert} isLoading={busy === "REVERT"} isDisabled={revertReason.trim().length < 5}>
              Revert Device Time Correction
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ------------------------------------------------ batch detail */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Correction #{viewing && viewing.attendance_device_time_correction_id}{" "}
            {viewing ? <Badge colorScheme={STATUS_COLOR[viewing.status] || "gray"}>{viewing.status}</Badge> : null}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewing ? (
              <Box overflowX="auto">
                <Text fontSize="xs" color="gray.600" mb={2}>
                  {viewing.reason_label} · {offsetLabel(viewing.offset_minutes)} · batch ID {viewing.batch_ref}
                </Text>
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Employee ID</Th>
                      <Th>Employee Name</Th>
                      <Th>Original Punch</Th>
                      <Th>Corrected Punch</Th>
                      <Th>In use</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {(viewing.punches || []).map((p) => (
                      <Tr key={p.biomax_punch_id}>
                        <Td fontSize="xs">{p.employee_id || p.user_id}</Td>
                        <Td fontSize="xs">{p.employee_name || "—"}</Td>
                        <Td fontSize="xs">{p.original_io_time}</Td>
                        <Td fontSize="xs">{p.corrected_io_time}</Td>
                        <Td fontSize="xs">{Number(p.is_active) === 1 ? "Corrected time" : "Original time"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </GlobalWrapper>
  );
}

function Stat({ label, value }) {
  return (
    <Box>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase">{label}</Text>
      <Text fontSize="sm" fontWeight="600">{value === null || value === undefined ? "—" : value}</Text>
    </Box>
  );
}
