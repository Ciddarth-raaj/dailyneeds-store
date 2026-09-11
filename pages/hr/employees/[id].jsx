import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Button,
  Stack,
  Alert,
  AlertIcon,
  Spinner,
  Divider,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import LifecycleTimeline from "../../../components/hr/LifecycleTimeline";
import AadhaarVerifyModal from "../../../components/hr/AadhaarVerifyModal";
import { ResignModal, RejoinModal } from "../../../components/hr/LifecycleActionModals";
import AadhaarSection from "../../../components/hr/profile/AadhaarSection";
import PersonalSection from "../../../components/hr/profile/PersonalSection";
import EmploymentSection from "../../../components/hr/profile/EmploymentSection";
import EducationSection from "../../../components/hr/profile/EducationSection";
import PaymentDetailsSection from "../../../components/hr/profile/PaymentDetailsSection";
import StatutorySection from "../../../components/hr/profile/StatutorySection";
import PayrollSection from "../../../components/hr/profile/PayrollSection";
import DocumentsSection from "../../../components/hr/profile/DocumentsSection";
import BankDetailsEditor from "../../../components/hr/profile/BankDetailsEditor";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDepartments from "../../../customHooks/useDepartments";
import useDesignations from "../../../customHooks/useDesignations";
import useCurrentWorkShift from "../../../customHooks/useCurrentWorkShift";
import useWorkShiftOptions from "../../../customHooks/useWorkShiftOptions";
import { useUser } from "../../../contexts/UserContext";
import HrHelper from "../../../helper/hr";
import EmployeeHelper from "../../../helper/employee";
import EmployeeWorkShiftHelper from "../../../helper/employeeWorkShift";
import { canVerifyBank, lifecycleActions } from "../../../util/hrStatus";
import {
  buildHrPatch,
  buildSensitivePayload,
  canAssignShift,
  canEditEmployee,
  canEditPaymentDetails,
  canEditStatutoryDetails,
  canViewDocuments,
  canViewSensitive,
  unwrapEmployee,
} from "../../../util/hrProfile";

/**
 * The employee profile. The ONE employee master record, in the ONE order.
 *
 * M1: the sections are the same eight, in the same sequence, that Add
 * Employee walks a store manager through - the wizard is the first four of
 * them and stops; the profile shows all eight. There is no separate layout
 * for editing an existing employee.
 *
 *   1 Aadhaar Verification   Aadhaar status; Verify now under `employee_edit`
 *   2 Personal Details       `employee_edit`
 *   3 Employment Details     `employee_edit`; the shift from the NEW work
 *                            shift master, changed here only under
 *                            `employee_edit` + `assign_employee_shift`
 *   4 Education              `employee_edit`
 *   5 Payment Details        Cash / Bank and the bank card, under the
 *                            sensitive pair + `edit_payment_details`
 *   6 Statutory Details      PAN / PF / ESI, sensitive pair +
 *                            `edit_statutory_details`
 *   7 Payroll                position only until M2/M3 - nothing is shown
 *                            and nothing can be typed
 *   8 Documents              read-only, `view_documents`
 *
 * Separate sections rather than one long form, because they are governed
 * differently, and a single Save across all of them would either need the
 * union of every permission or fail as a whole. `employee_create` alone
 * opens NOTHING on this page beyond what `employee_edit` opens: it is the
 * onboarding key, and onboarding is over once the ID exists.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *
 *   Salary               pay belongs to Payroll, which owns the structure,
 *                        the revisions, the approvals and the history. The
 *                        Payroll section will show the currently effective
 *                        approved salary (M3) and never edit it.
 *   Employment History   shown only where there IS a history - see below.
 *
 * TWO WRITE PATHS, because the backend has two - see `util/hrProfile.js`. The
 * ordinary editor takes what `EDITABLE_FIELDS` allows; the payment and
 * statutory columns are deliberately absent from it and go through
 * /employee/updatedata, which B3 and the M1 section keys guard.
 *
 * NEVER RENDERED HERE: a full Aadhaar number, a full account number, any
 * fingerprint or ciphertext. `view_aadhaar_full` is granted to nobody by
 * design, so there is no reveal affordance at all.
 *
 * NEVER EDITED HERE: the employee ID, the joining date, the employment
 * status. The first is allocated by the database; the other two are
 * lifecycle state that Create, Resign and Rejoin own and record a reason for.
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
  const mayEditPayment = canEditPaymentDetails(actor);
  const mayEditStatutory = canEditStatutoryDetails(actor);
  const mayAssignShift = canAssignShift(actor);
  const mayViewDocuments = canViewDocuments(actor);
  const canViewLifecycle = usePermissions(["view_employee_lifecycle"]);

  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();
  const { designations } = useDesignations();
  // Bumped after a shift assignment so the current-shift read runs again.
  const [shiftVersion, setShiftVersion] = useState(0);
  // The NEW shift mapping. `useShifts` - the legacy `/shift` master - is
  // deliberately not used on this screen.
  const currentShift = useCurrentWorkShift(id, shiftVersion);
  // The active shifts for the Employment dropdown. Fetched only for somebody
  // who may assign; everyone else sees the current shift as text.
  const { options: shiftOptions } = useWorkShiftOptions(mayAssignShift);

  const [lifecycle, setLifecycle] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [aadhaar, setAadhaar] = useState(null);
  const [bank, setBank] = useState(null);
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
      const [lc, emp, aa, bk] = await Promise.all([
        HrHelper.getLifecycle(id).catch(() => null),
        EmployeeHelper.getEmployeeByID(id).catch(() => null),
        HrHelper.getAadhaarStatus(id).catch(() => null),
        HrHelper.getBankStatus(id).catch(() => null),
      ]);
      const usable = (r) => (r && !r.code ? r : null);
      setLifecycle(usable(lc));
      setEmployee(unwrapEmployee(emp));
      setAadhaar(usable(aa));
      setBank(usable(bk));
      if (!usable(lc)) {
        setLoadError(lc && lc.msg ? lc.msg : "This employee could not be loaded.");
      }
    } catch (err) {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

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
   * The shift, through Employee Shift Assignment's own single assign - the
   * same endpoint, the same all-or-nothing rule, the same permission pair.
   * Nothing here writes the legacy `shift_id`.
   */
  const assignShift = async (workShiftId) => {
    setSaving(true);
    try {
      const res = await EmployeeWorkShiftHelper.assignWorkShift([Number(id)], workShiftId);
      if (failed(res)) {
        toast({ title: res.msg || "The shift was not changed", status: "error", duration: 7000 });
        return false;
      }
      toast({ title: "Shift assigned", status: "success", duration: 2500 });
      // The shift read is its own hook; a reload of the page data refreshes
      // the rest, and the hook re-reads on the next render of the id.
      await load();
      setShiftVersion((v) => v + 1);
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
  /**
   * The verification response was lost. Find out whether the check itself was.
   *
   * `GET /bank/verification` is a free read of what the backend stored, and the
   * backend stores the provider's answer before returning it. So a status that
   * has settled on a real verdict is evidence that the paid check DID run, and
   * the honest thing - as well as the cheap thing - is to report that verdict
   * rather than to invite a second one.
   *
   * PENDING is the case that stays unknown: it is equally the shape of "the
   * check never ran" and "it ran but stored nothing we can see yet", and
   * guessing either way is worse than saying so.
   */
  const reconcileLostVerification = async () => {
    const settled = (status) =>
      ["VERIFIED", "NAME_MISMATCH", "DUPLICATE_ACCOUNT", "FAILED"].includes(status);

    let fresh = null;
    try {
      fresh = await HrHelper.getBankStatus(id);
    } catch (readErr) {
      fresh = null;
    }
    const status = fresh && !fresh.code ? fresh.status : null;

    if (status === "VERIFIED") {
      // The check completed and passed. Only the answer went missing.
      toast({ title: "Bank details saved and verified", status: "success", duration: 4000 });
      return { saved: true, verified: true, status };
    }
    if (settled(status)) {
      // A real verdict, already paid for. Show it as the outcome it is - the
      // user corrects the details or deals with it on the card, exactly as if
      // the response had arrived.
      return {
        saved: true,
        verified: false,
        status,
        verdict: (fresh.verification && fresh.verification.name_match_verdict) || null,
      };
    }
    // Genuinely undetermined. The details ARE saved; what is unknown is
    // whether a check was spent. `indeterminate` stops the editor offering
    // another one until the user changes the details or goes to the card.
    return {
      saved: true,
      verified: false,
      indeterminate: true,
      message:
        "The details were saved, but the connection dropped before the bank check reported back - it may or may not have run. To avoid paying for a second check, use Verify Bank Details on the bank card once you have looked at the current status there.",
    };
  };

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
      if (phase === "save") {
        return {
          saved: null,
          message:
            "The connection failed while saving, so it is not certain whether the details were stored. The bank card has been refreshed - check it before trying again.",
        };
      }
      // LOSING THE RESPONSE IS NOT LOSING THE VERIFICATION. The backend
      // records the provider's answer before it returns it, so a check that
      // was already paid for may well have completed and been stored while
      // the response never arrived. Offering "verify again" here would spend
      // a second one for nothing. So read the status back - a free read - and
      // let the stored result speak.
      return reconcileLostVerification();
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

  // More than one employment period means a resign and a rejoin: a real
  // service history, and the only case where the timeline says anything the
  // Employment card does not.
  const periodCount = Array.isArray(lifecycle.periods) ? lifecycle.periods.length : 0;
  const hasEmploymentHistory = periodCount > 1;

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
              The full employee record could not be loaded, so only the lifecycle, Aadhaar, bank and
              document sections are shown.
            </Alert>
          ) : null}

          {/* ============================ 1. Aadhaar Verification ==== */}
          <AadhaarSection
            aadhaar={aadhaar}
            canVerify={canEdit}
            onVerify={() => setAadhaarOpen(true)}
          />

          {/* ================================ 2. Personal Details ==== */}
          <PersonalSection
            employee={employee || {}}
            canEdit={canEdit && Boolean(employee)}
            onSave={saveOrdinary}
            saving={saving}
          />

          {/* ============================== 3. Employment Details ==== */}
          <EmploymentSection
            employee={employee || {}}
            lifecycle={lifecycle}
            outlets={outlets}
            departments={departments}
            designations={designations}
            currentShift={currentShift}
            shiftOptions={shiftOptions}
            canEdit={canEdit && Boolean(employee)}
            canAssignShift={mayAssignShift}
            onSave={saveOrdinary}
            onAssignShift={assignShift}
            saving={saving}
          />

          {/* ======================================= 4. Education ==== */}
          <EducationSection
            employee={employee || {}}
            canEdit={canEdit && Boolean(employee)}
            onSave={saveOrdinary}
            saving={saving}
          />

          {/* ================================= 5. Payment Details ==== */}
          <PaymentDetailsSection
            employee={employee || {}}
            bank={bank}
            lifecycle={lifecycle}
            permissions={permissions}
            isAdmin={isAdmin}
            canView={mayViewSensitive}
            canEdit={mayEditPayment && Boolean(employee)}
            canEditBank={mayEditPayment}
            onSave={saveSensitive}
            onEditBankDetails={() => setBankEditOpen(true)}
            onBankChanged={load}
            saving={saving}
          />

          {/* =============================== 6. Statutory Details ==== */}
          <StatutorySection
            employee={employee || {}}
            canView={mayViewSensitive}
            canEdit={mayEditStatutory && Boolean(employee)}
            onSave={saveSensitive}
            saving={saving}
          />

          {/* ========================================= 7. Payroll ==== */}
          <PayrollSection />

          {/* ======================================= 8. Documents ==== */}
          <DocumentsSection employeeId={lifecycle.employee_id} canView={mayViewDocuments} />

          {/* -------------------------------------------------- lifecycle
              ONLY WHERE THERE IS A HISTORY TO SHOW. For the great majority of
              employees the timeline was one period, repeating the joining
              date the Employment card already carries - so the screen said
              the same thing twice and implied there was something to compare.
              A second period means a resign and a rejoin, which is exactly
              the service record this panel exists for.

              A MISSING JOINING DATE IS A DATA PROBLEM, NOT A REASON TO SHOW
              THIS. The old card leaned on the timeline to admit an undated
              period; that is a row to fix in the lifecycle review, and
              showing a redundant panel to 600 people is not how to say it. */}
          {canViewLifecycle && hasEmploymentHistory ? (
            <LifecycleTimeline lifecycle={lifecycle} />
          ) : null}

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
        canVerify={canVerifyBank({ permissions, isAdmin }) && mayEditPayment}
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
