import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import SalaryBreakup from "./SalaryBreakup";
import PayrollSalaryHelper from "../../helper/payrollSalary";
import { describeApiResult, KIND } from "../../util/salaryApiError";
import {
  COMPONENT_FIELDS,
  COMPONENT_LABELS,
  limitsFromPreview,
  toRequestBody,
  validateRevisionForm,
} from "../../util/salaryRevisionForm";
import {
  periodLockOf,
  presentPreview,
  previewEffectiveFrom,
} from "../../util/salaryPreviewView";
import { formatMoney, formatEffectiveFrom } from "../../util/salaryView";

/**
 * M4 — proposing a salary: the opening one, or a revision to it.
 *
 * THE SERVER IS THE ONLY CALCULATOR, AND THIS FORM IS BUILT SO IT CANNOT BE
 * OTHERWISE. Submit is disabled until a PREVIEW has come back, and any change
 * to any field throws the preview away - so what somebody agrees to on screen
 * is, always, a structure the server produced from the inputs that are in the
 * form at that moment. Nothing here derives a Basic, a contribution or a CTC,
 * and there is no branch in which a figure is shown that the server did not
 * send.
 *
 * OPENING SALARY AND REVISION ARE DECIDED BY THE SERVER, NOT CHOSEN HERE. The
 * screen reads which it will be from the employee's history (any non-rejected
 * row means a revision) and DISPLAYS that; the server decides it again on the
 * way in. For an opening salary the effective date is the later of the opening
 * floor and the date of joining, the caller does not get to choose it, and the
 * field is shown as the resolved date rather than as an input somebody could
 * type into and watch be ignored.
 *
 * THE THREE REASONS ARE NEVER THE SAME FIELD:
 *
 *   Revision Reason   why the pay is changing. Mandatory for a revision,
 *                     absent for an opening salary.
 *   Override Reason   why the four components depart from the automatic
 *                     breakup. Its own field, its own permission, and needed
 *                     only when the override is on.
 *   Rejection Reason  the approver's, written on the Approval screen.
 *
 * A PENDING PROPOSAL IS AMENDED, NEVER DUPLICATED. Where one exists, the
 * default is to amend it (`edit_salary`), because proposing a second one at
 * the same date is the conflict the server refuses. Approved and rejected
 * history is not editable from here or from anywhere.
 *
 * EVERY REFUSAL IS SHOWN AS THE SERVER WORDED IT. A same-date conflict, a
 * queued future revision, a locked period - each carries the sentence that
 * says what to do about it, and paraphrasing them here would be a second copy
 * of a rule that lives on the server.
 */

const EMPTY_COMPONENTS = {
  basic: "",
  conveyance: "",
  hra: "",
  special_allowance: "",
};

const MODE = { CREATE: "create", AMEND: "amend" };

function SalaryRevisionForm({
  employeeId,
  isOpening,
  currentSalary,
  pending,
  canAdd,
  canEdit,
  canOverride,
  onSaved,
}) {
  const [mode, setMode] = useState(MODE.CREATE);

  const [monthlyGross, setMonthlyGross] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [components, setComponents] = useState(EMPTY_COMPONENTS);
  const [overrideReason, setOverrideReason] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);
  const [errors, setErrors] = useState({});

  /*
   * A PENDING PROPOSAL IS THE DEFAULT SUBJECT WHERE THERE IS ONE. Somebody
   * arriving at a screen that already has an undecided proposal on it almost
   * always means to change that, and proposing a second at the same date is
   * exactly what the server refuses.
   */
  useEffect(() => {
    if (pending && canEdit) {
      setMode(MODE.AMEND);
      setMonthlyGross(pending.monthly_gross != null ? String(pending.monthly_gross) : "");
      setEffectiveFrom(pending.effective_from || "");
      setRevisionReason(pending.revision_reason || "");
      setManualOverride(Boolean(pending.manual_override));
      setComponents({
        basic: pending.basic != null ? String(pending.basic) : "",
        conveyance: pending.conveyance != null ? String(pending.conveyance) : "",
        hra: pending.hra != null ? String(pending.hra) : "",
        special_allowance:
          pending.special_allowance != null ? String(pending.special_allowance) : "",
      });
      setOverrideReason(pending.override_reason || "");
    } else {
      setMode(MODE.CREATE);
      setMonthlyGross("");
      setEffectiveFrom("");
      setRevisionReason("");
      setManualOverride(false);
      setComponents(EMPTY_COMPONENTS);
      setOverrideReason("");
    }
    setPreview(null);
    setProblem(null);
    setErrors({});
  }, [employeeId, pending, canEdit]);

  /*
   * ANY EDIT INVALIDATES THE PREVIEW.
   *
   * This is the mechanism behind "the server is the only calculator", not a
   * nicety: a preview that survived an edit would be a structure on screen
   * that no longer matches the form, and Submit would send different numbers
   * from the ones somebody read.
   */
  const invalidate = (setter) => (value) => {
    setPreview(null);
    setProblem(null);
    setter(value);
  };

  // Amending a pending proposal cannot move its date - the record's identity
  // is not up for amendment, only its numbers - so the form shows the stored
  // date and does not offer to change it.
  const dateIsFixed = isOpening || mode === MODE.AMEND;

  /*
   * WHETHER A REASON IS REQUIRED FOLLOWS THE RECORD'S OWN SOURCE.
   *
   * `isOpening` answers "would a NEW proposal be this employee's first", and a
   * PENDING opening-salary proposal already makes that false - it is a live
   * record. So amending that very proposal would otherwise demand a revision
   * reason for a row whose source is OPENING_SALARY, which the server does not
   * require and which would be a screen inventing a rule.
   *
   * When amending, the stored source decides. When proposing, `isOpening`
   * does, exactly as the server will.
   */
  const changesNothingYet =
    mode === MODE.AMEND && pending ? pending.source === "OPENING_SALARY" : isOpening;

  const form = useMemo(
    () => ({
      is_opening: changesNothingYet,
      monthly_gross: monthlyGross,
      effective_from: mode === MODE.AMEND ? pending && pending.effective_from : effectiveFrom,
      revision_reason: revisionReason,
      manual_override: manualOverride,
      components,
      override_reason: overrideReason,
    }),
    [
      changesNothingYet,
      monthlyGross,
      mode,
      pending,
      effectiveFrom,
      revisionReason,
      manualOverride,
      components,
      overrideReason,
    ]
  );

  const limits = limitsFromPreview(preview);
  const view = presentPreview(preview);
  const lock = periodLockOf(preview);

  const runPreview = async () => {
    const check = validateRevisionForm(form, { can_override: canOverride, limits });
    setErrors(check.errors);
    if (!check.valid) return;

    setPreviewing(true);
    setProblem(null);
    try {
      const body = await PayrollSalaryHelper.preview(employeeId, toRequestBody(form));
      const outcome = describeApiResult(body);
      if (outcome.kind !== KIND.OK) {
        setPreview(null);
        setProblem(outcome);
        return;
      }
      setPreview(body);
    } catch (err) {
      setPreview(null);
      setProblem({ kind: KIND.ERROR, message: "The preview could not be loaded. Please try again." });
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async () => {
    // Guarded here as well as by the button's disabled state: a double click
    // that lands between renders must not send two proposals.
    if (saving || !preview) return;

    const check = validateRevisionForm(form, { can_override: canOverride, limits });
    setErrors(check.errors);
    if (!check.valid) return;

    setSaving(true);
    setProblem(null);
    try {
      const body = toRequestBody(form);
      const result =
        mode === MODE.AMEND
          ? await PayrollSalaryHelper.amendPending(pending.salary_id, body)
          : await PayrollSalaryHelper.create(employeeId, body);

      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        // A same-date conflict, a queued future revision, a locked period or a
        // refused permission - shown exactly as the server worded it, because
        // the wording is the actionable part. NOTHING is replaced on the
        // caller's behalf.
        setProblem(outcome);
        return;
      }

      setPreview(null);
      onSaved(
        mode === MODE.AMEND
          ? "The pending proposal has been updated. It still needs approval."
          : "The proposal has been submitted and is now pending approval."
      );
    } catch (err) {
      setProblem({ kind: KIND.ERROR, message: "The proposal could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------- what is allowed */

  const mayAmend = Boolean(pending) && canEdit;
  const mayCreate = canAdd;

  if (!mayCreate && !mayAmend) {
    return (
      <Alert status="info" fontSize="sm">
        <AlertIcon />
        You may view this employee&apos;s salary, but you do not have permission to propose or
        amend one.
      </Alert>
    );
  }

  const editingDisabled = mode === MODE.AMEND ? !canEdit : !canAdd;

  return (
    <Stack spacing={4}>
      {/* -------------------------------------- what this proposal will be -- */}
      {isOpening ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">This will be the Opening Salary.</Text>
            <Text>
              No salary has been approved for this employee yet. The effective date is set by the
              opening-salary rule — the later of 01 Apr 2026 and the date of joining — and cannot be
              chosen here.
            </Text>
          </Box>
        </Alert>
      ) : null}

      {pending ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">
              There is already a pending proposal effective{" "}
              {formatEffectiveFrom(pending.effective_from)} of{" "}
              {formatMoney(pending.monthly_gross)}.
            </Text>
            <Text>
              {canEdit
                ? "It can be amended below until somebody approves or rejects it."
                : "It must be approved or rejected before it can change. You do not have permission to amend a pending proposal."}
            </Text>
          </Box>
        </Alert>
      ) : null}

      {pending && canEdit && canAdd ? (
        <Stack direction="row" spacing={2}>
          <Button
            size="xs"
            variant={mode === MODE.AMEND ? "solid" : "outline"}
            colorScheme="purple"
            onClick={() => {
              setMode(MODE.AMEND);
              setPreview(null);
              setProblem(null);
            }}
          >
            Amend the pending proposal
          </Button>
          <Button
            size="xs"
            variant={mode === MODE.CREATE ? "solid" : "outline"}
            colorScheme="purple"
            onClick={() => {
              // A NEW proposal starts empty rather than prefilled from the
              // pending one. Carrying the old revision reason across would
              // attach one proposal's justification to a different proposal,
              // which is the kind of audit trail nobody can read later.
              setMode(MODE.CREATE);
              setPreview(null);
              setProblem(null);
              setErrors({});
              setEffectiveFrom("");
              setMonthlyGross("");
              setRevisionReason("");
              setManualOverride(false);
              setComponents(EMPTY_COMPONENTS);
              setOverrideReason("");
            }}
          >
            Propose a new revision
          </Button>
        </Stack>
      ) : null}

      {/* ------------------------------------------------------- the inputs -- */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl isInvalid={Boolean(errors.monthly_gross)} isRequired>
          <FormLabel fontSize="xs">Monthly Gross Salary</FormLabel>
          <Input
            size="sm"
            type="number"
            inputMode="decimal"
            value={monthlyGross}
            onChange={(e) => invalidate(setMonthlyGross)(e.target.value)}
            isDisabled={editingDisabled}
            placeholder="e.g. 25000"
          />
          <FormErrorMessage fontSize="xs">{errors.monthly_gross}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.effective_from)} isRequired={!dateIsFixed}>
          <FormLabel fontSize="xs">Effective From</FormLabel>
          {dateIsFixed ? (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={1.5}>
              <Text fontSize="sm" color="gray.800">
                {mode === MODE.AMEND
                  ? formatEffectiveFrom(pending && pending.effective_from)
                  : previewEffectiveFrom(preview) || "Preview to see the date the rule resolves to"}
              </Text>
              <Text fontSize="10px" color="gray.500">
                {mode === MODE.AMEND
                  ? "A pending proposal keeps its effective date; only its figures can be amended."
                  : "Set by the opening-salary rule on the server."}
              </Text>
            </Box>
          ) : (
            <Input
              size="sm"
              type="date"
              value={effectiveFrom}
              onChange={(e) => invalidate(setEffectiveFrom)(e.target.value)}
              isDisabled={editingDisabled}
            />
          )}
          <FormErrorMessage fontSize="xs">{errors.effective_from}</FormErrorMessage>
        </FormControl>
      </SimpleGrid>

      {/* A revision has to say why. An opening salary changes nothing, so the
          field is not shown for one at all rather than shown and ignored. */}
      {changesNothingYet ? null : (
        <FormControl isInvalid={Boolean(errors.revision_reason)} isRequired>
          <FormLabel fontSize="xs">Revision Reason</FormLabel>
          <Textarea
            size="sm"
            rows={2}
            value={revisionReason}
            onChange={(e) => invalidate(setRevisionReason)(e.target.value)}
            isDisabled={editingDisabled}
            placeholder="Why is this salary changing? e.g. annual review increment, promotion"
          />
          <FormErrorMessage fontSize="xs">{errors.revision_reason}</FormErrorMessage>
        </FormControl>
      )}

      {/* ------------------------------------------- the manual override -- */}
      {canOverride ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={2}>
          <Checkbox
            size="sm"
            colorScheme="purple"
            isChecked={manualOverride}
            onChange={(e) => invalidate(setManualOverride)(e.target.checked)}
            isDisabled={editingDisabled}
          >
            <Text fontSize="sm" fontWeight="medium">
              Enter the component breakup manually
            </Text>
          </Checkbox>
          <Text fontSize="10px" color="gray.500" mt={1}>
            The gross stays fixed; the four components redistribute it and must add up to it.
            Moving Basic moves the PF wage, which is a statutory change — so it needs its own
            reason, and the server checks every figure again.
          </Text>

          {manualOverride ? (
            <Stack spacing={3} mt={3}>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {COMPONENT_FIELDS.map((field) => (
                  <FormControl key={field} isInvalid={Boolean(errors[field])}>
                    <FormLabel fontSize="xs">{COMPONENT_LABELS[field]}</FormLabel>
                    <Input
                      size="sm"
                      type="number"
                      inputMode="decimal"
                      value={components[field]}
                      onChange={(e) =>
                        invalidate(setComponents)({ ...components, [field]: e.target.value })
                      }
                      isDisabled={editingDisabled}
                    />
                    <FormErrorMessage fontSize="xs">{errors[field]}</FormErrorMessage>
                  </FormControl>
                ))}
              </SimpleGrid>

              {errors.components ? (
                <Alert status="error" fontSize="sm">
                  <AlertIcon />
                  {errors.components}
                </Alert>
              ) : null}

              <FormControl isInvalid={Boolean(errors.override_reason)} isRequired>
                <FormLabel fontSize="xs">Manual Override Reason</FormLabel>
                <Textarea
                  size="sm"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => invalidate(setOverrideReason)(e.target.value)}
                  isDisabled={editingDisabled}
                  placeholder="Why does the breakup depart from the automatic one?"
                />
                <FormErrorMessage fontSize="xs">{errors.override_reason}</FormErrorMessage>
              </FormControl>
            </Stack>
          ) : null}
        </Box>
      ) : null}

      {/* ---------------------------------------------------- the preview -- */}
      <Stack direction={{ base: "column", md: "row" }} spacing={2}>
        <Button
          size="sm"
          colorScheme="purple"
          variant="outline"
          onClick={runPreview}
          isLoading={previewing}
          loadingText="Calculating"
          isDisabled={editingDisabled || saving}
        >
          Preview
        </Button>
        <Button
          size="sm"
          colorScheme="purple"
          onClick={submit}
          isLoading={saving}
          loadingText="Saving"
          isDisabled={editingDisabled || !preview || previewing || Boolean(lock)}
        >
          {mode === MODE.AMEND ? "Save amendment" : "Submit for approval"}
        </Button>
      </Stack>

      {!preview && !previewing ? (
        <Text fontSize="xs" color="gray.600">
          Preview first. Every figure on a salary record is calculated by the server, and what you
          submit is exactly what the preview shows.
        </Text>
      ) : null}

      {problem ? (
        <Alert status={problem.kind === KIND.DENIED ? "info" : "error"} fontSize="sm">
          <AlertIcon />
          {problem.message}
        </Alert>
      ) : null}

      {lock ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          {lock.message}
        </Alert>
      ) : null}

      {view ? (
        <Box borderWidth="1px" borderColor="purple.200" borderRadius="lg" bg="white" p={3}>
          <Stack direction="row" align="center" spacing={2} mb={2}>
            <Badge colorScheme="purple" fontSize="9px">
              Preview
            </Badge>
            <Text fontSize="xs" color="gray.600">
              Calculated by the server. Nothing is saved until you submit, and the proposal will be
              created as Pending.
            </Text>
          </Stack>
          <SalaryBreakup view={view} compact />
        </Box>
      ) : null}

      {/* What this proposal is changing FROM, so the two are read together. */}
      {currentSalary ? (
        <Text fontSize="xs" color="gray.600">
          Current approved salary: {formatMoney(currentSalary.monthly_gross)} effective{" "}
          {formatEffectiveFrom(currentSalary.effective_from)}.
        </Text>
      ) : null}
    </Stack>
  );
}

export default SalaryRevisionForm;
