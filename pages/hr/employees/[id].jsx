import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box,
  Button,
  Stack,
  Text,
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
  Input,
  FormControl,
  FormLabel,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { AadhaarBadge, EmploymentBadge } from "../../../components/hr/StatusBadges";
import BankCard from "../../../components/hr/BankCard";
import LifecycleTimeline from "../../../components/hr/LifecycleTimeline";
import AadhaarVerifyModal from "../../../components/hr/AadhaarVerifyModal";
import { ResignModal, RejoinModal } from "../../../components/hr/LifecycleActionModals";
import usePermissions from "../../../customHooks/usePermissions";
import { useUser } from "../../../contexts/UserContext";
import HrHelper from "../../../helper/hr";
import { lifecycleActions } from "../../../util/hrStatus";

/**
 * Stage 0C / C3 — the employee profile.
 *
 * One page for everything about one person, rather than the same employee
 * scattered across five screens: who they are, their Aadhaar, their bank, the
 * lifecycle actions, and the service history that proves the permanent
 * employee ID survived every resignation and rejoin.
 *
 * WHAT IS NEVER RENDERED HERE: a full Aadhaar number, a full bank account
 * number, any fingerprint or ciphertext. `view_aadhaar_full` is granted to
 * nobody by design, so there is no "reveal" affordance at all — building one
 * would be building for a permission that does not exist.
 */
function EmployeeProfile() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;

  const { userConfig } = useUser();
  const permissions = userConfig.permissions || [];
  const isAdmin = String(userConfig.userType) === "2";

  const canEdit = usePermissions(["employee_edit"]);
  const canViewLifecycle = usePermissions(["view_employee_lifecycle"]);

  const [lifecycle, setLifecycle] = useState(null);
  const [aadhaar, setAadhaar] = useState(null);
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [rejoinOpen, setRejoinOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      // Three independent reads; a permission refusal on one must not blank
      // the whole page, so each is tolerated separately.
      const [lc, aa, bk] = await Promise.all([
        HrHelper.getLifecycle(id).catch(() => null),
        HrHelper.getAadhaarStatus(id).catch(() => null),
        HrHelper.getBankStatus(id).catch(() => null),
      ]);
      const denied = (r) => r && r.code === 403;
      setLifecycle(denied(lc) || !lc || lc.code ? null : lc);
      setAadhaar(denied(aa) || !aa || aa.code ? null : aa);
      setBank(denied(bk) || !bk || bk.code ? null : bk);
      if (!lc || lc.code) setLoadError(lc && lc.msg ? lc.msg : "This employee could not be loaded.");
    } catch (err) {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const patch = Object.fromEntries(
        Object.entries(edit).filter(([, v]) => v !== undefined && v !== "")
      );
      if (Object.keys(patch).length === 0) {
        setEditing(false);
        return;
      }
      const res = await HrHelper.editEmployee(id, patch);
      if (res && res.code && res.code !== 200) {
        toast({ title: res.msg || "The change was not saved", status: "error", duration: 6000 });
        return;
      }
      toast({ title: "Saved", status: "success", duration: 3000 });
      setEditing(false);
      setEdit({});
      load();
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlobalWrapper title="Employee">
        <CustomContainer title="Employee" filledHeader>
          <Stack align="center" py={10}>
            <Spinner />
          </Stack>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!lifecycle) {
    return (
      <GlobalWrapper title="Employee">
        <CustomContainer title="Employee" filledHeader>
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            {loadError ||
              "You do not have permission to view this employee, or they do not exist."}
          </Alert>
          <Link href="/hr/employees" passHref>
            <Button size="sm" mt={4} variant="outline">
              Back to employees
            </Button>
          </Link>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const current = lifecycle.current || {};
  const { canResign, canRejoin } = lifecycleActions({
    isActive: lifecycle.is_active,
    permissions,
    isAdmin,
  });

  return (
    <GlobalWrapper title={lifecycle.employee_name || "Employee"}>
      <CustomContainer
        title={`${lifecycle.employee_name} · ID ${lifecycle.employee_id}`}
        filledHeader
        rightSection={
          <Stack direction="row" spacing={2}>
            {canResign ? (
              <Button size="sm" colorScheme="red" variant="outline" onClick={() => setResignOpen(true)}>
                Resign
              </Button>
            ) : null}
            {canRejoin ? (
              <Button size="sm" colorScheme="green" onClick={() => setRejoinOpen(true)}>
                Rejoin
              </Button>
            ) : null}
          </Stack>
        }
      >
        <Stack spacing={5}>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
            {/* ------------------------------------------ basic details */}
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Stack direction="row" justify="space-between" align="center" mb={3}>
                <Text fontWeight="bold">Details</Text>
                <Stack direction="row" spacing={2} align="center">
                  <EmploymentBadge status={lifecycle.status} />
                  {canEdit ? (
                    <Button size="xs" variant="outline" onClick={() => setEditing(!editing)}>
                      {editing ? "Cancel" : "Edit"}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              {editing ? (
                <Stack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm">Name</FormLabel>
                    <Input
                      size="sm"
                      defaultValue={lifecycle.employee_name}
                      onChange={(e) => setEdit({ ...edit, employee_name: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Mobile</FormLabel>
                    <Input
                      size="sm"
                      onChange={(e) => setEdit({ ...edit, primary_contact_number: e.target.value })}
                    />
                  </FormControl>
                  <Text fontSize="xs" color="gray.600">
                    Employee ID, employment status and the lifecycle dates are not editable here — they
                    are set by the Create, Resign and Rejoin actions.
                  </Text>
                  <Button size="sm" colorScheme="purple" isLoading={saving} onClick={saveEdit}>
                    Save
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={1} fontSize="sm">
                  <Text>
                    <strong>Employee ID</strong> {lifecycle.employee_id}
                  </Text>
                  <Text>
                    <strong>Outlet</strong> {current.outlet_nickname || "—"}
                  </Text>
                  <Text>
                    <strong>Designation</strong> {current.designation_name || "—"}
                  </Text>
                  <Text>
                    <strong>Department</strong> {current.department_name || "—"}
                  </Text>
                  <Text>
                    <strong>Joined</strong> {current.date_of_joining || "not recorded"}
                  </Text>
                  {current.resignation_date ? (
                    <Text>
                      <strong>Left</strong> {current.resignation_date}
                    </Text>
                  ) : null}
                </Stack>
              )}
            </Box>

            {/* ------------------------------------------------ Aadhaar */}
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Stack direction="row" justify="space-between" align="center" mb={3}>
                <Text fontWeight="bold">Aadhaar</Text>
                <AadhaarBadge status={aadhaar ? aadhaar.aadhaar_status : "PENDING"} />
              </Stack>
              <Stack spacing={3} fontSize="sm">
                {aadhaar && aadhaar.aadhaar_status === "VERIFIED" ? (
                  <>
                    <Text>
                      Verified, ending <strong>{aadhaar.aadhaar_last4}</strong>.
                    </Text>
                    <Text color="gray.600">
                      The full number is encrypted and is not shown anywhere in this application.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text color="gray.600">
                      {aadhaar && aadhaar.message
                        ? aadhaar.message
                        : "No Aadhaar on record. This does not hold up anything else."}
                    </Text>
                    {canEdit && aadhaar && aadhaar.can_verify_now ? (
                      <Button
                        size="sm"
                        colorScheme="purple"
                        alignSelf="flex-start"
                        onClick={() => setAadhaarOpen(true)}
                      >
                        Verify now
                      </Button>
                    ) : null}
                  </>
                )}
              </Stack>
            </Box>
          </SimpleGrid>

          {/* ---------------------------------------------------- bank */}
          {bank ? (
            <BankCard
              employeeId={lifecycle.employee_id}
              bank={bank}
              permissions={permissions}
              isAdmin={isAdmin}
              onChanged={load}
            />
          ) : (
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              You do not have permission to see this employee&apos;s bank verification.
            </Alert>
          )}

          {/* ----------------------------------------------- lifecycle */}
          {canViewLifecycle ? <LifecycleTimeline lifecycle={lifecycle} /> : null}

          <Divider />
          <Link href="/hr/employees" passHref>
            <Button size="sm" variant="ghost" alignSelf="flex-start">
              Back to employees
            </Button>
          </Link>
        </Stack>
      </CustomContainer>

      <AadhaarVerifyModal
        isOpen={aadhaarOpen}
        onClose={() => setAadhaarOpen(false)}
        employeeName={lifecycle.employee_name}
        onVerified={async (decision, outcome) => {
          setAadhaarOpen(false);
          if (!outcome) return;
          if (outcome.kind !== "create") {
            // The Aadhaar already belongs to somebody. Attaching it here would
            // be refused by the backend anyway; say so plainly instead.
            toast({
              title: outcome.title,
              description: outcome.detail,
              status: "error",
              duration: 9000,
            });
            return;
          }
          try {
            const res = await HrHelper.attachAadhaar(lifecycle.employee_id, decision.verification_id);
            if (res && res.code && res.code !== 200) {
              toast({
                title: res.msg || "The Aadhaar could not be attached",
                description: res.existing_employee_id
                  ? `It already belongs to employee ${res.existing_employee_id}.`
                  : undefined,
                status: "error",
                duration: 9000,
              });
              return;
            }
            toast({
              title: `Aadhaar attached to employee ${lifecycle.employee_id}`,
              status: "success",
              duration: 4000,
            });
            load();
          } catch (err) {
            toast({ title: "Could not reach the server", status: "error", duration: 5000 });
          }
        }}
      />

      <ResignModal
        isOpen={resignOpen}
        onClose={() => setResignOpen(false)}
        employee={lifecycle}
        onDone={load}
      />
      <RejoinModal
        isOpen={rejoinOpen}
        onClose={() => setRejoinOpen(false)}
        employee={lifecycle}
        lifecycle={lifecycle}
        onDone={load}
      />
    </GlobalWrapper>
  );
}

export default EmployeeProfile;
