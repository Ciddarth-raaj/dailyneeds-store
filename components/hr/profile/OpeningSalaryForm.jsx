import React, { useState } from "react";
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
import SalaryBreakup from "../../payroll/SalaryBreakup";
import EmployeeSalaryHelper from "../../../helper/employeeSalary";
import { describeApiResult, KIND } from "../../../util/salaryApiError";
import {
  COMPONENT_FIELDS,
  COMPONENT_LABELS,
  limitsFromPreview,
  toRequestBody,
  validateRevisionForm,
} from "../../../util/salaryRevisionForm";
import {
  periodLockOf,
  presentPreview,
  previewEffectiveFrom,
} from "../../../util/salaryPreviewView";

/**
 * The OPENING salary, entered during onboarding — and nothing else, ever.
 *
 * WHY IT IS HERE AT ALL. Employee Master is where an employee's record is
 * built, and the person building it is the person who knows what they are being
 * paid. Sending them to a different screen to type one number is how people go
 * live with no salary on file. So this form exists for exactly one moment in an
 * employee's life: the one before they have any salary history.
 *
 * AND WHY IT IS ONLY THAT MOMENT. `components/hr/profile/PayrollSection.jsx`
 * renders this only in the NO_SALARY state - see
 * `util/employeeMasterPayroll.js`, which decides it from the server's own
 * history rather than from a date compared to a browser clock. Once a proposal
 * exists, pending or approved, the section is a display and a link to Payroll >
 * Salary Revision & History. A second place to REVISE a salary is a second
 * answer to what somebody is paid.
 *
 * THERE IS NO EFFECTIVE-DATE INPUT, AND THAT IS A RULE RATHER THAN A GAP. An
 * opening salary is dated the later of 01 Apr 2026 and the date of joining;
 * `usecase/employee_salary.js` resolves it and IGNORES any date sent with the
 * request. A field here would be a box somebody typed into and watched be
 * disregarded, so what is shown instead is the date the server resolved, read
 * off the preview.
 *
 * THE SERVER IS THE ONLY CALCULATOR, AND THIS FORM IS BUILT SO IT CANNOT BE
 * OTHERWISE. Submit is disabled until a PREVIEW has come back, and any change
 * to any field throws the preview away - so what somebody agrees to on screen
 * is, always, a structure the server produced from the inputs in the form at
 * that moment. Nothing here derives a Basic, a contribution or a CTC.
 *
 * IT IS THE SAME RULES MODULE THE PAYROLL SCREEN USES.
 * `util/salaryRevisionForm.js` validates, `util/salaryPreviewView.js` presents
 * and `components/payroll/SalaryBreakup.jsx` renders - one set of rules about
 * what an unresolved figure reads as, on every screen that shows pay.
 *
 * NOTHING IS EVER CREATED APPROVED. This lands a PENDING proposal, including
 * for an administrator, and somebody else approves it on Salary Approval. The
 * section refreshes afterwards and shows the waiting state rather than the
 * form, so there is no way to propose twice.
 */
const EMPTY_COMPONENTS = {
  basic: "",
  conveyance: "",
  hra: "",
  special_allowance: "",
};

function OpeningSalaryForm({ employeeId, canOverride = false, onSubmitted }) {
  const [monthlyGross, setMonthlyGross] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [components, setComponents] = useState(EMPTY_COMPONENTS);
  const [overrideReason, setOverrideReason] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);
  const [errors, setErrors] = useState({});

  /*
   * ANY EDIT INVALIDATES THE PREVIEW. This is the mechanism behind "the server
   * is the only calculator", not a nicety: a preview that survived an edit
   * would be a structure on screen that no longer matches the form, and Submit
   * would send different numbers from the ones somebody read.
   */
  const invalidate = (setter) => (value) => {
    setPreview(null);
    setProblem(null);
    setter(value);
  };

  /*
   * `is_opening` IS FIXED TRUE, because this form only ever exists in that
   * state. It is what tells the shared validator not to demand an effective
   * date (the server's) or a revision reason (an opening salary changes
   * nothing, so there is nothing for a reason to be about).
   */
  const form = {
    is_opening: true,
    monthly_gross: monthlyGross,
    effective_from: "",
    revision_reason: "",
    manual_override: manualOverride,
    components,
    override_reason: overrideReason,
  };

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
      const body = await EmployeeSalaryHelper.preview(employeeId, toRequestBody(form));
      const outcome = describeApiResult(body);
      if (outcome.kind !== KIND.OK) {
        setPreview(null);
        setProblem(outcome);
        return;
      }
      setPreview(body);
    } catch (err) {
      setPreview(null);
      setProblem({
        kind: KIND.ERROR,
        message: "The preview could not be loaded. Please try again.",
      });
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
      const result = await EmployeeSalaryHelper.createOpeningSalary(
        employeeId,
        toRequestBody(form)
      );
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        /*
         * Shown exactly as the server worded it. The one that matters here is
         * "a salary proposal is already pending": somebody else may have
         * raised one while this form was open, and the sentence tells the user
         * what to do about it. Paraphrasing it would be a second copy of a rule
         * that lives on the server.
         */
        setProblem(outcome);
        return;
      }
      setPreview(null);
      setMonthlyGross("");
      setManualOverride(false);
      setComponents(EMPTY_COMPONENTS);
      setOverrideReason("");
      // The section re-reads the server and renders the waiting state. It does
      // not patch a proposal into state it guessed the shape of.
      if (onSubmitted) await onSubmitted();
    } catch (err) {
      setProblem({
        kind: KIND.ERROR,
        message: "The opening salary could not be saved. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Alert status="info" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">This will be the employee&apos;s Opening Salary.</Text>
          <Text>
            No salary has been recorded for this employee yet. The effective date is set by the
            opening-salary rule — the later of 01 Apr 2026 and the date of joining — and cannot be
            chosen here. Later changes are made on Payroll &gt; Salary Revision &amp; History.
          </Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl isInvalid={Boolean(errors.monthly_gross)} isRequired>
          <FormLabel fontSize="xs">Monthly Gross Salary</FormLabel>
          <Input
            size="sm"
            type="number"
            inputMode="decimal"
            value={monthlyGross}
            onChange={(e) => invalidate(setMonthlyGross)(e.target.value)}
            placeholder="e.g. 25000"
          />
          <FormErrorMessage fontSize="xs">{errors.monthly_gross}</FormErrorMessage>
        </FormControl>

        {/* NOT AN INPUT. The server's answer, displayed. */}
        <FormControl>
          <FormLabel fontSize="xs">Effective From</FormLabel>
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={1.5}>
            <Text fontSize="sm" color="gray.800">
              {previewEffectiveFrom(preview) || "Preview to see the date the rule resolves to"}
            </Text>
            <Text fontSize="10px" color="gray.500">
              Set by the opening-salary rule on the server.
            </Text>
          </Box>
        </FormControl>
      </SimpleGrid>

      {/* ------------------------------------------- the manual override -- */}
      {canOverride ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={2}>
          <Checkbox
            size="sm"
            colorScheme="purple"
            isChecked={manualOverride}
            onChange={(e) => invalidate(setManualOverride)(e.target.checked)}
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
          isDisabled={saving}
        >
          Preview
        </Button>
        <Button
          size="sm"
          colorScheme="purple"
          onClick={submit}
          isLoading={saving}
          loadingText="Saving"
          isDisabled={!preview || previewing || Boolean(lock)}
        >
          Submit for approval
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
              Calculated by the server. Nothing is saved until you submit, and the opening salary
              will be created as Pending.
            </Text>
          </Stack>
          <SalaryBreakup view={view} compact />
        </Box>
      ) : null}
    </Stack>
  );
}

export default OpeningSalaryForm;
