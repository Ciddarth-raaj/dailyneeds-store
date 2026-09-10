import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertIcon, Badge, Button, Spinner, Stack, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceHelper from "../../../helper/attendance";
import { displayDateTime } from "../../../util/attendanceRaw";

/**
 * Biomax Devices - the terminal registry.
 *
 * Columns: Device Label | Cloud ID | Location | Effective From | Effective To |
 * Status | Last Punch | Actions. Location is the CURRENT open period; the
 * full history is on the device page. Status is derived: Active while an open
 * period exists, Inactive otherwise.
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

  useEffect(() => {
    load();
  }, [load]);

  const colDefs = [
    { field: "label", headerName: "Device Label", minWidth: 160 },
    { field: "dev_id", headerName: "Cloud ID", minWidth: 180, cellRenderer: (p) => <span style={{ fontFamily: "monospace" }}>{p.value}</span> },
    { field: "current_outlet", headerName: "Location", minWidth: 140, valueGetter: (p) => (p.data ? p.data.current_outlet || "" : "") },
    { field: "current_effective_from", headerName: "Effective From", minWidth: 160, valueGetter: (p) => (p.data ? displayDateTime(p.data.current_effective_from) : "") },
    { field: "inactive_since", headerName: "Effective To", minWidth: 160, valueGetter: (p) => (p.data && p.data.status === "INACTIVE" ? displayDateTime(p.data.inactive_since) : "") },
    {
      field: "status",
      headerName: "Status",
      minWidth: 110,
      cellRenderer: (p) => (p.data ? <Badge colorScheme={p.data.status === "ACTIVE" ? "green" : "gray"}>{p.data.status === "ACTIVE" ? "Active" : "Inactive"}</Badge> : null),
    },
    { field: "last_punch_at", headerName: "Last Punch", minWidth: 160, valueGetter: (p) => (p.data ? displayDateTime(p.data.last_punch_at) : "") },
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
        <CustomContainer title="Unregistered devices seen" subtitle="Cloud IDs that have sent punches but are not registered. Their punches are stored and held out of the Attendance List until the device is registered with a location." filledHeader>
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
