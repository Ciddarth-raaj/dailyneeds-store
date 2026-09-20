import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertIcon, Badge, Button, Spinner, Stack, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceHelper from "../../../helper/attendance";
import { displayDateTime, displayIstDateTime } from "../../../util/attendanceRaw";
import {
  assignmentColor,
  assignmentLabel,
  connectionColor,
  connectionLabel,
  healthSummary,
  receiverColor,
  receiverLabel,
  sinceText,
} from "../../../util/biomaxDevices";

/**
 * Biomax Devices - the terminal registry.
 *
 * Columns: Device Label | Cloud ID | Location | Assignment | Connection |
 * Last Seen | Last Punch | Punches Today | Actions.
 *
 * ASSIGNMENT IS NOT CONNECTION, AND THE SCREEN SAYS BOTH. Assignment is the
 * administrative state - Active while an open location period exists. It
 * never changes by itself, so it says nothing about whether the terminal is
 * plugged in. Connection is the machine fact, computed by the API from
 * biomax_device.last_seen_at, which the receiver touches on every poll. A
 * device can be Active and Offline (somebody must go and look) or Inactive
 * and Connected (still polling from a shelf), and only a screen that shows
 * the two independently can be acted on.
 *
 * THE CLASSIFICATION IS THE SERVER'S. No timeout is applied here; the API
 * sends the word and this page colours it.
 *
 * TIMES WRITTEN BY MACHINES ARE CONVERTED. Last Seen and Last Punch are
 * MySQL NOW(3) on a UTC server, so they go through displayIstDateTime.
 * Effective From / To and the unregistered-device punch times do not: those
 * are respectively administrator-typed wall clock and the terminal's own
 * IST clock (biomax_punch.io_time), and converting either would move a time
 * somebody already read correctly.
 *
 * Below the registry: Cloud IDs that have punched but are not registered.
 * Their punches are stored and quarantined; Register opens Add Device with
 * the Cloud ID filled in and the first punch time suggested as Effective
 * From, so quarantined history is covered deliberately.
 *
 * THERE IS NO DELETE. A broken terminal is deactivated and its replacement
 * added under its own Cloud ID; the old record and its punches stay.
 */
export default function BiomaxDevicesPage() {
  const canManage = usePermissions(["manage_biomax_devices"]);
  const [devices, setDevices] = useState([]);
  const [unregistered, setUnregistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [health, setHealth] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u] = await Promise.all([AttendanceHelper.getDevices(), AttendanceHelper.getUnregisteredDevices()]);
      if ((d && d.code === 403) || (u && u.code === 403)) {
        setAccessDenied(true);
      } else {
        setDevices((d && d.data) || []);
        setUnregistered((u && u.data) || []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Health is fetched SEPARATELY from the device list, and its failure is
   * swallowed. The receiver probe can time out while every terminal is
   * perfectly healthy; when it does, the header says Unknown and the table
   * below still renders from last_seen_at, which is our own data. A table
   * that refuses to load because a health widget could not be drawn is a
   * worse outage than the one it was reporting.
   */
  const loadHealth = useCallback(async () => {
    try {
      const res = await AttendanceHelper.getDeviceReceiverHealth();
      setHealth(res && res.code === 200 ? res.data : null);
    } catch (err) {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    load();
    loadHealth();
  }, [load, loadHealth]);

  const colDefs = [
    { field: "label", headerName: "Device Label", minWidth: 150 },
    { field: "dev_id", headerName: "Cloud ID", minWidth: 170, cellRenderer: (p) => <span style={{ fontFamily: "monospace" }}>{p.value}</span> },
    { field: "current_outlet", headerName: "Location", minWidth: 140, valueGetter: (p) => (p.data ? p.data.current_outlet || "" : "") },
    {
      field: "status",
      headerName: "Assignment",
      minWidth: 120,
      cellRenderer: (p) => (p.data ? <Badge colorScheme={assignmentColor(p.data.status)}>{assignmentLabel(p.data.status)}</Badge> : null),
    },
    {
      field: "connection_status",
      headerName: "Connection",
      minWidth: 130,
      cellRenderer: (p) =>
        p.data ? (
          <Badge colorScheme={connectionColor(p.data.connection_status)} title={sinceText(p.data.seconds_since_seen)}>
            {connectionLabel(p.data.connection_status)}
          </Badge>
        ) : null,
    },
    { field: "last_seen_at", headerName: "Last Seen", minWidth: 160, valueGetter: (p) => (p.data ? displayIstDateTime(p.data.last_seen_at) : "") },
    { field: "last_punch_at", headerName: "Last Punch", minWidth: 160, valueGetter: (p) => (p.data ? displayIstDateTime(p.data.last_punch_at) : "") },
    { field: "punches_today", headerName: "Punches Today", minWidth: 120 },
    {
      field: "biomax_device_id",
      headerName: "Actions",
      type: "action-icons",
      valueGetter: (p) =>
        p.data
          ? [{ label: canManage ? "Manage" : "View", iconType: canManage ? "edit" : "view", redirectionUrl: `/attendance/devices/${p.data.biomax_device_id}` }]
          : [],
    },
  ];

  const summary = health ? healthSummary(health) : null;

  return (
    <GlobalWrapper title="Biomax Devices" permissionKey={["view_biomax_devices"]}>
      <CustomContainer
        title="Biomax Devices"
        subtitle="Face-recognition terminals and where each one is. Locations are effective-dated: moving or replacing a terminal never rewrites where a past punch happened."
        filledHeader
        rightSection={
          canManage ? (
            <Link href="/attendance/devices/new" passHref>
              <Button colorScheme="purple" size="sm">+ Add Device</Button>
            </Link>
          ) : null
        }
      >
        {accessDenied ? null : (
          <Stack direction={{ base: "column", md: "row" }} spacing={5} align={{ md: "center" }} fontSize="sm" mb={4}>
            <Stack direction="row" spacing={2} align="center">
              <Text fontWeight="bold">Biomax Receiver:</Text>
              <Badge colorScheme={summary ? summary.receiver_color : "gray"}>{summary ? summary.receiver_label : "Unknown"}</Badge>
            </Stack>
            {summary && summary.counts ? (
              <>
                <Text><b>Connected:</b> {summary.connected_text}</Text>
                <Text><b>Stale:</b> {summary.counts.stale}</Text>
                <Text><b>Offline:</b> {summary.counts.offline}</Text>
                {summary.counts.never_seen > 0 ? <Text color="gray.500">Never seen: {summary.counts.never_seen}</Text> : null}
              </>
            ) : (
              <Text color="gray.500">
                Receiver health could not be checked. The device list below is unaffected - each terminal still shows the connection its own last contact earns.
              </Text>
            )}
          </Stack>
        )}
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view Biomax devices.
          </Alert>
        ) : loading ? (
          <Stack align="center" py={10}>
            <Spinner color="purple.500" />
          </Stack>
        ) : (
          <AgGrid rowData={devices} colDefs={colDefs} tableKey="biomax-devices" hideExport />
        )}
      </CustomContainer>

      {!accessDenied && !loading ? (
        <CustomContainer title="Unregistered devices seen" subtitle="Cloud IDs that have sent punches but are not registered. Their punches are stored and held out of the Attendance List until the device is registered with a location. Times are the terminal's own clock, which is already IST." filledHeader>
          {unregistered.length === 0 ? (
            <Text fontSize="sm" color="gray.500">None.</Text>
          ) : (
            <Stack spacing={2}>
              {unregistered.map((u) => (
                <Stack key={u.dev_id} direction={{ base: "column", md: "row" }} spacing={4} align={{ md: "center" }} fontSize="sm">
                  <Text fontFamily="mono" minW="200px">{u.dev_id}</Text>
                  <Text>{u.punches} punch(es), {displayDateTime(u.first_punch)} to {displayDateTime(u.last_punch)}</Text>
                  <Text color="gray.500">from {u.last_source_ip || "-"}</Text>
                  {canManage ? (
                    <Link href={`/attendance/devices/new?dev_id=${encodeURIComponent(u.dev_id)}&first_punch=${encodeURIComponent(u.first_punch || "")}`} passHref>
                      <Button size="xs" colorScheme="purple" variant="outline">Register</Button>
                    </Link>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </CustomContainer>
      ) : null}
    </GlobalWrapper>
  );
}
