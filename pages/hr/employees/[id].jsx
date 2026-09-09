import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box,
  Button,
  Stack,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { AadhaarBadge } from "../../../components/hr/StatusBadges";
import BankCard from "../../../components/hr/BankCard";
import LifecycleTimeline from "../../../components/hr/LifecycleTimeline";
import AadhaarVerifyModal from "../../../components/hr/AadhaarVerifyModal";
import { ResignModal, RejoinModal } from "../../../components/hr/LifecycleActionModals";
import { SectionCard } from "../../../components/hr/profile/SectionCard";
import PersonalSection from "../../../components/hr/profile/PersonalSection";
import EmploymentSection from "../../../components/hr/profile/EmploymentSection";
import StatutorySection from "../../../components/hr/profile/StatutorySection";
import CompensationSection from "../../../components/hr/profile/CompensationSection";
import EducationSection from "../../../components/hr/profile/EducationSection";
import DocumentsSection from "../../../components/hr/profile/DocumentsSection";
import BankDetailsEditor from "../../../components/hr/profile/BankDetailsEditor";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDepartments from "../../../customHooks/useDepartments";
import useDesignations from "../../../customHooks/useDesignations";
import useShifts from "../../../customHooks/useShifts";
import { useUser } from "../../../contexts/UserContext";
import HrHelper from "../../../helper/hr";
import EmployeeHelper from "../../../helper/employee";
import DocumentHelper from "../../../helper/document";
import { canVerifyBank, lifecycleActions } from "../../../util/hrStatus";
import {
  buildHrPatch,
  buildSensitivePayload,
  canEditEmployee,
  canEditSensitive,
  canViewDocuments,
  canViewSensitive,
  unwrapEmployee,
} from "../../../util/hrProfile";

/**
 * Stage 0C / C3 — the employee profile. The ONE employee master record.
 *
 * Nine sections rather than one long form, because they are governed
 * differently: Personal and Employment by `employee_edit`; Statutory, Salary
 * and the bank details by B3's sensitive keys; Aadhaar and Bank by C2's own
 * permissions; Lifecycle by Resign and Rejoin. A single Save across all of
 * them would either need the union of every permission or fail as a whole.
 *
 * TWO WRITE PATHS, because the backend has two - see `util/hrProfile.js`. The
 * ordinary editor takes what `EDITABLE_FIELDS` allows; the statutory, salary
 * and bank columns are deliberately absent from it and go through
 * /employee/updatedata, which B3 guards.
 *
 * NEVER RENDERED HERE: a full Aadhaar number, a full account number, any
 * fingerprint or ciphertext. `view_aadhaar_full` is granted to nobody by
 * design, so there is no reveal affordance at all.
 *
 * NEVER EDITED HERE: the employee ID, the joining date, the employment
 * status. The first is allocated by the database; the other two are lifecycle
 * state that Create, Resign and Rejoin own and record a reason for.
 */
function EmployeeProfile() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;

  const { userConfig } = useUser();
  const permissions = userConfig.permissions || [];
  const isAdmin = String(userConfig.userType) === "2";
  const actor = { permissions, isAdmin };

  const canEdit = canEditEmployee(actor);
  const mayViewSensitive = canViewSensitive(actor);
  const mayEditSensitive = canEditSensitive(actor);
  const mayViewDocuments = canViewDocuments(actor);
  const canViewLifecycle = usePermissions(["view_employee_lifecycle"]);

  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();
  const { designations } = useDesignations();
  const { shifts } = useShifts();

  const [lifecycle, setLifecycle] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [aadhaar, setAadhaar] = useState(null);
  const [bank, setBank] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsError, setDocumentsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [rejoinOpen, setRejoinOpen] = useState(false);
  const [bankEditOpen, setBankEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      // Independent reads. A permission refusal on any one of them must not
      // blank the page, so each is tolerated on its own and each section says
      // for itself what it could not show.
      const [lc, emp, aa, bk, docs] = await Promise.all([
        HrHelper.getLifecycle(id).catch(() => null),
        EmployeeHelper.getEmployeeByID(id).catch(() => null),
        HrHelper.getAadhaarStatus(id).catch(() => null),
        HrHelper.getBankStatus(id).catch(() => null),
        mayViewDocuments ? DocumentHelper.getDocType(id).catch(() => "error") : Promise.resolve([]),
      ]);
      const usable = (r) => (r && !r.code ? r : null);
      setLifecycle(usable(lc));
      setEmployee(unwrapEmployee(emp));
      setAadhaar(usable(aa));
      setBank(usable(bk));
      setDocuments(Array.isArray(docs) ? docs : []);
      setDocumentsError(docs === "error");
      if (!usable(lc)) {
        setLoadError(lc && lc.msg ? lc.msg : "This employee could not be loaded.");
      }
    } catch (err) {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [id, mayViewDocuments]);

  useEffect(() => {
    load();
  }, [load]);

  /** The backend refuses `{}` with "nothing to change"; say so without a request. */
  const nothingToSave = () => {
    toast({ title: "Nothing was changed", status: "info", duration: 2500 });
    return false;
  };

  const failed = (res) => res && res.code && res.code !== 200;

  /** Personal, Employment, Education — POST /hr/employee/:id/edit. */
  const saveOrdinary = async (form) => {
    const patch = buildHrPatch(employee || {}, form);
    if (Object.keys(patch).length === 0) return nothingToSave();

    setSaving(true);
    try {
      const res = await HrHelper.editEmployee(id, patch);
      if (failed(res)) {
        toast({ title: res.msg || "The change was not saved", status: "error", duration: 7000 });
        return false;
      }
      toast({ title: "Saved", status: "success", duration: 2500 });
      await load();
      return true;
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Statutory, Salary, bank details — POST /employee/updatedata, B3-guarded. */
  const saveSensitive = async (form) => {
    const payload = buildSensitivePayload(id, employee || {}, form);
    // Null rather than an empty body on purpose: that endpoint ends in
    // `UPDATE ... SET ?`, where an empty object is invalid SQL.
    if (!payload) return nothingToSave();

    setSaving(true);
    try {
      const res = await EmployeeHelper.updateEmployeeDetails(payload);
      if (failed(res)) {
        toast({
          title: res.msg || "The change was not saved",
          description:
            res.code === 403
              ? "These fields need sensitive-edit access."
              : undefined,
          status: "error",
          duration: 7000,
        });
        return false;
      }
      toast({ title: "Saved", status: "success", duration: 2500 });
      await load();
      return true;
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Bank: save the details, then verify the STORED account, in that order.
   *
   * Two existing backend operations called in sequence rather than one fused
   * transaction. They have different permissions, different audit entries and
   * different failure modes, and combining them server-side for one button
   * would make each harder to reason about. What the sequence buys is a single
   * HR action; what it costs is a partial outcome, which is reported honestly
   * rather than hidden.
   *
   * THE ENTERED ACCOUNT NUMBER IS NEVER SENT TO THE VERIFY CALL. That route
   * takes an employee id and reads the stored account itself - which is what
   * makes the fingerprint, and therefore the staleness protection, mean
   * anything.
   *
   * `phase` matters on a network failure: a connection that dies during the
   * save leaves it genuinely unknown whether the account was stored, and
   * claiming either way would be a guess. The status is refreshed and the
   * uncertainty is stated.
   */
  const saveAndVerifyBank = async (form) => {
    const payload = buildSensitivePayload(id, employee || {}, form);
    let phase = "save";

    setSaving(true);
    try {
      if (payload) {
        const res = await EmployeeHelper.updateEmployeeDetails(payload);
        if (failed(res)) {
          // Nothing was stored, so nothing is verified and no paid call is
          // spent. The editor keeps what was typed.
          return { saved: false, message: res && res.msg };
        }
      }
      // No payload means the details on file already match what was typed -
      // not a failure, and no reason to skip the verification the user asked
      // for.

      phase = "verify";
      const verification = await HrHelper.verifyBank(id);
      await load();

      // A refusal from the route itself: not configured, no account on file,
      // or a permission the user turns out not to hold.
      if (verification && verification.code && verification.code !== 200) {
        return { saved: true, verified: false, message: verification.msg };
      }

      // A 200 carrying a non-VERIFIED status is the provider's real answer,
      // not an error. Its own message and status are passed through untouched.
      const status = verification && verification.status;
      if (status === "VERIFIED") {
        toast({ title: "Bank details saved and verified", status: "success", duration: 4000 });
        return { saved: true, verified: true, status };
      }
      return {
        saved: true,
        verified: false,
        status,
        message: verification && verification.message,
      };
    } catch (err) {
      // Refresh rather than retry: repeating the sequence blind could spend a
      // second paid verification for one HR action.
      await load();
      return phase === "save"
        ? {
            saved: null,
            message:
              "The connection failed while saving, so it is not certain whether the details were stored. The bank card has been refreshed - check it before trying again.",
          }
        : {
            saved: true,
            verified: false,
            message:
              "The details were saved, but the verification could not be completed. The bank card has been refreshed; use Verify Bank Details there when you are ready.",
          };
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
            {loadError || "You do not have permission to view this employee, or they do not exist."}
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
        <Stack spacing={4}>
          {!employee ? (
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              The full employee record could not be loaded, so only the lifecycle, Aadhaar and bank
              sections are shown.
            </Alert>
          ) : null}

          <PersonalSection
            employee={employee || {}}
            canEdit={canEdit && Boolean(employee)}
            onSave={saveOrdinary}
            saving={saving}
          />

          <EmploymentSection
            employee={employee || {}}
            lifecycle={lifecycle}
            outlets={outlets}
            departments={departments}
            designations={designations}
            shifts={shifts}
            canEdit={canEdit && Boolean(employee)}
            onSave={saveOrdinary}
            saving={saving}
          />

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
            {/* ------------------------------------------------- Aadhaar */}
            <SectionCard
              title="Aadhaar"
              badge={<AadhaarBadge status={aadhaar ? aadhaar.aadhaar_status : "PENDING"} />}
            >
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
            </SectionCard>

            <StatutorySection
              employee={employee || {}}
              canView={mayViewSensitive}
              canEdit={mayEditSensitive && Boolean(employee)}
              onSave={saveSensitive}
              saving={saving}
            />
          </SimpleGrid>

          {/* ------------------------------------------------------- bank */}
          {bank ? (
            <Box>
              {/* Add/Change now lives inside the card's action row, beside
                  Verify, so the next step is one decision rather than a button
                  under a card that already had buttons. */}
              <BankCard
                employeeId={lifecycle.employee_id}
                bank={bank}
                permissions={permissions}
                isAdmin={isAdmin}
                onChanged={load}
                canEditSensitive={mayEditSensitive}
                onEditDetails={() => setBankEditOpen(true)}
              />
            </Box>
          ) : (
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              You do not have permission to see this employee&apos;s bank verification.
            </Alert>
          )}

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
            <CompensationSection
              employee={employee || {}}
              canView={mayViewSensitive}
              canEdit={mayEditSensitive && Boolean(employee)}
              onSave={saveSensitive}
              saving={saving}
            />
            <DocumentsSection
              documents={documents}
              canView={mayViewDocuments}
              error={documentsError}
            />
          </SimpleGrid>

          <EducationSection
            employee={employee || {}}
            canEdit={canEdit && Boolean(employee)}
            onSave={saveOrdinary}
            saving={saving}
          />

          {/* -------------------------------------------------- lifecycle */}
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
            if (failed(res)) {
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

      <BankDetailsEditor
        isOpen={bankEditOpen}
        onClose={() => setBankEditOpen(false)}
        bank={bank || {}}
        onSave={saveSensitive}
        onSaveAndVerify={saveAndVerifyBank}
        // Both permissions, or the editor saves and stops rather than offering
        // a button that would predictably 403.
        canVerify={canVerifyBank({ permissions, isAdmin }) && mayEditSensitive}
        saving={saving}
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
