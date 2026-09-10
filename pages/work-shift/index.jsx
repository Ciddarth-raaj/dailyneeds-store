import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Button,
  Input,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import usePermissions from "../../customHooks/usePermissions";
import WorkShiftHelper from "../../helper/workShift";
import { activeBadge, matchesWorkShiftSearch } from "../../util/workShiftForm";

/**
 * Work Shift Master — the list.
 *
 * A SEPARATE SCREEN FROM /shift, AND THE OLD ONE STAYS. `shift_master` is
 * still what the live system and `new_employee.shift_id` point at; this is the
 * new payroll/attendance master on `work_shift`, and Phase 1 runs the two side
 * by side rather than migrating anything.
 *
 * THERE IS NO DELETE, here or on the server. Inactive replaces it: a work
 * shift that stops being used is switched off and keeps its seven-day
 * schedule. Deleting one would cascade that schedule away.
 *
 * Permissions are the legacy shift master's, unchanged — `view_shift` to
 * look, `add_shifts` to add or edit — which is what the backend routes
 * require. Whoever maintains shifts today maintains work shifts.
 */
function WorkShiftList() {
  const toast = useToast();
  const canManage = usePermissions(["add_shifts"]);

  const [workShifts, setWorkShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await WorkShiftHelper.getWorkShifts();
      // A refusal arrives as `{ code: 403, msg }` rather than a list — see
      // util/api.js — and must not be shown as "no work shifts".
      if (res && res.code === 403) {
        setAccessDenied(true);
        setWorkShifts([]);
        return;
      }
      setAccessDenied(false);
      setWorkShifts(Array.isArray(res && res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      toast({ title: "Could not load work shifts", status: "error", duration: 5000 });
      setWorkShifts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The Status column is the deactivate path, because there is no Delete and
   * something has to be. It is the same switch-in-the-status-column the legacy
   * Shift list uses, and it keeps the approved four columns as they are rather
   * than growing a second action icon.
   */
  const setActive = async (workShiftId, active) => {
    try {
      const res = await WorkShiftHelper.updateStatus(workShiftId, active);
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The status could not be updated",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
        return;
      }
      toast({
        title: active ? "Work shift activated" : "Work shift deactivated",
        status: "success",
        duration: 3000,
      });
      load();
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    }
  };

  const rows = workShifts.filter((shift) => matchesWorkShiftSearch(shift, search));

  const colDefs = [
    {
      field: "shift_code",
      headerName: "Shift Code",
    },
    {
      field: "shift_name",
      headerName: "Shift Name",
    },
    {
      field: "active",
      headerName: "Status",
      // A plain string so sorting, filtering and export read as words rather
      // than as 1 and 0; the switch is drawn over it.
      valueGetter: (props) =>
        props.data ? activeBadge(props.data.active).label : "",
      cellRenderer: (props) => {
        if (!props || !props.data) return null;
        const isActive = Boolean(props.data.active);
        return (
          <Stack direction="row" align="center" h="100%" spacing={2}>
            <Switch
              size="sm"
              colorScheme="purple"
              isChecked={isActive}
              isDisabled={!canManage}
              aria-label={`${props.data.shift_name} status`}
              onChange={() => setActive(props.data.work_shift_id, !isActive)}
            />
            <Text fontSize="sm" color={isActive ? "green.600" : "gray.500"}>
              {isActive ? "Active" : "Inactive"}
            </Text>
          </Stack>
        );
      },
    },
    {
      field: "work_shift_id",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (props) =>
        props.data
          ? [
              {
                label: canManage ? "Edit" : "View",
                iconType: canManage ? "edit" : "view",
                redirectionUrl: `/work-shift/${props.data.work_shift_id}`,
              },
            ]
          : [],
    },
  ];

  return (
    <GlobalWrapper title="Work Shift Master" permissionKey={["view_shift"]}>
      <CustomContainer
        title="Work Shift Master"
        subtitle="Attendance and payroll shift configuration. The legacy Shift master is unchanged."
        filledHeader
        rightSection={
          canManage ? (
            <Link href="/work-shift/new" passHref>
              <Button colorScheme="purple" size="sm">
                + Add Work Shift
              </Button>
            </Link>
          ) : null
        }
      >
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view work shifts.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
              <Input
                size="sm"
                placeholder="Search shift code or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxW={{ base: "100%", md: "280px" }}
              />
            </Stack>

            {loading ? (
              <Stack align="center" py={10}>
                <Spinner color="purple.500" />
              </Stack>
            ) : (
              <AgGrid rowData={rows} colDefs={colDefs} />
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default WorkShiftList;
