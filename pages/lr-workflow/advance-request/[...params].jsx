import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import { Badge, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import CustomInput from "../../../components/customInput/customInput";
import usePeople from "../../../customHooks/usePeople";
import { useDistributors } from "../../../customHooks/useDistributors";
import usePermissions from "../../../customHooks/usePermissions";
import useAdvanceRequestById from "../../../customHooks/useAdvanceRequestById";
import asset from "../../../helper/asset";
import toast from "react-hot-toast";
import moment from "moment";
import currencyFormatter from "../../../util/currencyFormatter";
import * as Yup from "yup";
import {
  APPROVAL_DECISIONS,
  BALANCE_ACTIONS,
  STAGE_PERMISSION,
  getCurrentStage,
  getStatusMeta,
  isEditableStatus,
  isStageCompleted,
  isTerminal,
} from "../../../constants/advanceRequest";
import {
  createAdvanceRequest,
  updateAdvanceRequest,
  submitBalanceCheck,
  submitBalanceAction,
  submitApproval,
  submitPayment,
  addAdvanceRequestDocument,
} from "../../../helper/advanceRequest";

/**
 * The supplier is a distributor, picked from the same master that
 * /master/distributors maintains. Only the bank still comes from
 * people_list, where person_type 6 lives.
 */
const BANK_TYPE = 6;

/**
 * Each stage collects its own fields, so each needs its own schema. These
 * mirror the Joi schemas the API validates against; the API is what actually
 * decides, this is only so the user hears about it sooner.
 */
const STAGE_SCHEMAS = {
  a1: Yup.object({
    // An advance is often asked for before any invoice number exists, so the
    // reference is optional - as is the reason, which the request note the
    // team sends today does not carry.
    invoice_number: Yup.string()
      .max(100, "Invoice No. cannot exceed 100 characters")
      .nullable(),
    distributor_code: Yup.number()
      .typeError("Select a Supplier")
      .required("Supplier is required"),
    amount: Yup.number()
      .typeError("Amount must be a number")
      .required("Amount is required")
      .min(0.01, "Amount must be greater than 0"),
    reason: Yup.string()
      .max(500, "Reason cannot exceed 500 characters")
      .nullable(),
    docs: Yup.mixed().optional(),
  }),
  "a1.1": Yup.object({
    // 0 is the "nothing outstanding" answer, and it is what sends the
    // request straight on to the admin - so it has to be entered, not left
    // blank.
    previous_advance_balance: Yup.number()
      .typeError("Previous Advance Balance must be a number")
      .required("Previous Advance Balance is required")
      .min(0, "Previous Advance Balance cannot be negative"),
    balance_remarks: Yup.string()
      .max(500, "Remarks cannot exceed 500 characters")
      .nullable(),
  }),
  "a1.2": Yup.object({
    balance_action: Yup.string()
      .required("Choose what to do about the balance")
      .oneOf(
        BALANCE_ACTIONS.map((item) => item.id),
        "Choose what to do about the balance"
      ),
    balance_action_note: Yup.string()
      .max(500, "Note cannot exceed 500 characters")
      .nullable(),
  }),
  a2: Yup.object({
    decision: Yup.string()
      .required("Choose approve, hold or reject")
      .oneOf(
        APPROVAL_DECISIONS.map((item) => item.id),
        "Choose approve, hold or reject"
      ),
    approval_note: Yup.string()
      .max(500, "Note cannot exceed 500 characters")
      .nullable(),
    // Only offered when releasing a hold, so it is never required.
    balance_action: Yup.string()
      .oneOf(
        BALANCE_ACTIONS.map((item) => item.id),
        "Choose what to do about the balance"
      )
      .nullable(),
    balance_action_note: Yup.string()
      .max(500, "Note cannot exceed 500 characters")
      .nullable(),
  }),
  a3: Yup.object({
    paid_amount: Yup.number()
      .typeError("Amount must be a number")
      .required("Amount is required")
      .min(0.01, "Amount must be greater than 0"),
    utr: Yup.string()
      .required("UTR is required")
      .max(100, "UTR cannot exceed 100 characters"),
    bank_id: Yup.number()
      .typeError("Select a Bank")
      .required("Bank is required"),
    payment_date: Yup.date()
      .typeError("Select a Payment Date")
      .required("Payment Date is required"),
    proof: Yup.mixed().required("Payment Advice is required"),
  }),
};

/**
 * The API answers an error with a `code` and a `msg`; a success carries the
 * record itself. 409 in particular means someone else moved the request on
 * while this form was open, so the message is worth showing verbatim.
 */
const unwrap = (response) => {
  if (response && response.code && response.code !== 200) {
    const err = new Error(response.msg || "Something went wrong");
    err.code = response.code;
    throw err;
  }
  return response;
};

/** Uploads one File and returns the stored URL. */
const uploadFile = async (file, id) => {
  const result = await asset.upload(
    file,
    file.name,
    "lr-workflow/advance-request",
    undefined,
    `${id}_${file.name}`
  );

  if (result.code !== 200 || !result.remoteUrl) {
    throw new Error("Could not upload file");
  }

  return result.remoteUrl;
};

/** One stage's card: the shared Formik shell every stage was repeating. */
function StageCard({
  title,
  editable,
  initialValues,
  validationSchema,
  onSubmit,
  submitLabel,
  renderFields,
}) {
  return (
    <CustomContainer title={title} smallHeader>
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({ handleSubmit, resetForm, isSubmitting, values, setFieldValue }) => (
          <div>
            {renderFields({ editable, values, setFieldValue })}

            {editable && (
              <Flex mt={8} justify="flex-end" gap="12px">
                <Button
                  variant="outline"
                  colorScheme="red"
                  onClick={() => resetForm()}
                  isDisabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button
                  colorScheme="purple"
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                >
                  {submitLabel}
                </Button>
              </Flex>
            )}
          </div>
        )}
      </Formik>
    </CustomContainer>
  );
}

function AdvanceRequestForm() {
  const router = useRouter();
  const mode = router.query.params?.[0];
  const id = router.query.params?.[1];

  const createMode = mode === "create";
  const editMode = mode === "edit";

  const { request, loading, refetch } = useAdvanceRequestById(
    createMode ? null : id
  );

  const { peopleList } = usePeople();

  const { distributors } = useDistributors();

  // HQ_DIST_CODE is the master's own primary key, which is what a request
  // stores; MDM_DIST_NAME is the name the team knows the supplier by.
  const suppliers = useMemo(
    () =>
      (distributors || [])
        .filter((item) => item.HQ_DIST_CODE != null)
        .map((item) => ({
          id: item.HQ_DIST_CODE,
          value: item.MDM_DIST_NAME || String(item.HQ_DIST_CODE),
        })),
    [distributors]
  );

  const banks = useMemo(
    () =>
      peopleList
        .filter((item) => item.person_type === BANK_TYPE)
        .map((item) => ({ id: item.person_id, value: item.name })),
    [peopleList]
  );

  const canCreate = usePermissions(["create_advance_request"]);
  const canEdit = usePermissions(["edit_advance_request"]);
  const canCheckBalance = usePermissions(["view_old_balance_check"]);
  const canApprove = usePermissions(["approve_advance_request"]);
  const canPay = usePermissions(["pay_advance_request"]);
  const canDecideBalance = usePermissions(["create_advance_request"]);

  const status = request?.status;
  const terminal = isTerminal(status);
  const heldByAdmin = status === "on_hold";

  // A new request is at A1; an existing one is wherever its status says.
  const currentStage = createMode ? "a1" : getCurrentStage(status);

  // Keyed off the shared STAGE_PERMISSION map so this page and the rest of
  // the app cannot drift on who may act where. A1 is absent on purpose:
  // correcting the details is the separate edit route, not a stage action.
  const permissionHeld = {
    [STAGE_PERMISSION["a1.1"]]: canCheckBalance,
    [STAGE_PERMISSION["a1.2"]]: canDecideBalance,
    [STAGE_PERMISSION.a2]: canApprove,
    [STAGE_PERMISSION.a3]: canPay,
  };

  const stagePermission = {
    a1: false,
    "a1.1": permissionHeld[STAGE_PERMISSION["a1.1"]],
    "a1.2": permissionHeld[STAGE_PERMISSION["a1.2"]],
    a2: permissionHeld[STAGE_PERMISSION.a2],
    a3: permissionHeld[STAGE_PERMISSION.a3],
  };

  /**
   * What has happened, plus the one step this person can do about it.
   *
   * Showing every stage up to the current one meant a purchase user who had
   * just raised a request landed on the accounts balance-check form - a step
   * they neither own nor can complete. An empty form reads as something to
   * fill in, so a stage that has not run yet is shown only to whoever can
   * actually run it.
   */
  const isVisible = (stage) => {
    if (createMode) return stage === "a1";
    if (!request) return false;
    if (isStageCompleted(stage, request)) return true;
    return stage === currentStage && Boolean(stagePermission[stage]);
  };

  /**
   * Only the stage that still has work to do can be acted on, and only by
   * someone holding that stage's permission. Editing the A1 details is a
   * separate route, since correcting a typo is not the same as advancing the
   * workflow.
   */
  const isEditable = (stage) => {
    if (createMode) return stage === "a1" && canCreate;
    if (editMode) {
      return stage === "a1" && isEditableStatus(status) && canEdit;
    }
    if (terminal) return false;
    return stage === currentStage && Boolean(stagePermission[stage]);
  };

  const reportError = (err) => {
    toast.error(err.message || "Something went wrong");
    // A conflict means this page is out of date — reload rather than let the
    // user keep acting on a request that has already moved.
    if (err.code === 409) refetch();
  };

  // ------------------------------------------------------------------ A1

  const a1InitialValues = useMemo(
    () => ({
      invoice_number: request?.invoice_number ?? "",
      distributor_code: request?.distributor_code ?? null,
      amount: request?.amount ?? null,
      reason: request?.reason ?? "",
      docs: null,
    }),
    [request]
  );

  const handleA1 = async (values) => {
    try {
      const payload = {
        invoice_number: values.invoice_number || null,
        distributor_code: Number(values.distributor_code),
        amount: Number(values.amount),
        reason: values.reason || null,
      };

      if (createMode) {
        const created = unwrap(await createAdvanceRequest(payload));
        const newId = created.advance_request_id;

        await attachDocuments(values.docs, newId, "a1");

        toast.success("Advance request created");
        // Back to the list rather than into the new request. Opening it would
        // present the next step - the accounts balance check - to the person
        // who just raised it, and an admin holds every permission, so no
        // permission check can tell "my job" from "I can do everything".
        router.push("/lr-workflow/advance-request");
        return;
      }

      unwrap(await updateAdvanceRequest(id, payload));
      await attachDocuments(values.docs, id, "a1");

      toast.success("Advance request updated");
      router.push(`/lr-workflow/advance-request/view/${id}`);
    } catch (err) {
      reportError(err);
    }
  };

  /** Uploads whatever the file field holds, then records the URLs. */
  const attachDocuments = async (docs, requestId, stage) => {
    const files = (Array.isArray(docs) ? docs : [docs]).filter(
      (file) => file && file.name
    );

    if (files.length === 0) return;

    try {
      for (const file of files) {
        const url = await uploadFile(file, requestId);
        unwrap(await addAdvanceRequestDocument(requestId, stage, url));
      }
    } catch (err) {
      // The request itself is saved; only the attachment failed, so say that
      // rather than implying the whole thing was lost.
      toast.error("Saved, but a document could not be attached");
    }
  };

  // ---------------------------------------------------------------- A1.1

  const a11InitialValues = useMemo(
    () => ({
      previous_advance_balance: request?.previous_advance_balance ?? null,
      balance_remarks: request?.balance_remarks ?? "",
    }),
    [request]
  );

  const handleA11 = async (values) => {
    try {
      const balance = Number(values.previous_advance_balance);

      unwrap(
        await submitBalanceCheck(id, {
          previous_advance_balance: balance,
          balance_remarks: values.balance_remarks || "",
        })
      );

      // The figure decides where it goes, so say which happened rather than
      // leaving the user to work it out from the badge.
      toast.success(
        balance > 0
          ? "Sent back to purchase to decide on the balance"
          : "No balance outstanding — sent for approval"
      );
      refetch();
    } catch (err) {
      reportError(err);
    }
  };

  // ---------------------------------------------------------------- A1.2

  const a12InitialValues = useMemo(
    () => ({
      balance_action: request?.balance_action ?? null,
      balance_action_note: request?.balance_action_note ?? "",
    }),
    [request]
  );

  const handleA12 = async (values) => {
    try {
      unwrap(
        await submitBalanceAction(id, {
          balance_action: values.balance_action,
          balance_action_note: values.balance_action_note || "",
        })
      );

      toast.success("Decision recorded — sent for approval");
      refetch();
    } catch (err) {
      reportError(err);
    }
  };

  // ------------------------------------------------------------------ A2

  const a2InitialValues = useMemo(
    () => ({
      decision: null,
      approval_note: request?.approval_note ?? "",
      balance_action: request?.balance_action ?? null,
      balance_action_note: "",
    }),
    [request]
  );

  const handleA2 = async (values) => {
    try {
      const payload = {
        decision: values.decision,
        approval_note: values.approval_note || "",
      };

      // Only sent when the admin is releasing a hold, which is the one
      // moment they get to decide about the balance.
      if (heldByAdmin && values.balance_action) {
        payload.balance_action = values.balance_action;
        payload.balance_action_note = values.balance_action_note || "";
      }

      unwrap(await submitApproval(id, payload));

      toast.success(
        {
          approve: "Request approved",
          hold: "Request put on hold",
          reject: "Request rejected",
        }[values.decision] || "Decision recorded"
      );
      refetch();
    } catch (err) {
      reportError(err);
    }
  };

  // ------------------------------------------------------------------ A3

  const a3InitialValues = useMemo(
    () => ({
      // Defaults to the approved amount, which is what is usually paid.
      paid_amount: request?.paid_amount ?? request?.amount ?? null,
      utr: request?.utr ?? "",
      bank_id: request?.bank_id ?? null,
      payment_date: request?.payment_date
        ? new Date(request.payment_date)
        : null,
      proof: null,
    }),
    [request]
  );

  const handleA3 = async (values) => {
    try {
      // Upload first: it is the step most likely to fail, and failing before
      // the payment is recorded leaves the request cleanly re-payable.
      const proofUrl = await uploadFile(values.proof, id);

      unwrap(
        await submitPayment(id, {
          paid_amount: Number(values.paid_amount),
          utr: values.utr,
          bank_id: Number(values.bank_id),
          payment_date: moment(values.payment_date).format("YYYY-MM-DD"),
        })
      );

      unwrap(await addAdvanceRequestDocument(id, "a3", proofUrl));

      toast.success("Payment recorded");
      refetch();
    } catch (err) {
      reportError(err);
    }
  };

  // --------------------------------------------------------------- render

  const statusMeta = status ? getStatusMeta(status) : null;

  const title = createMode
    ? "Create Advance Request"
    : editMode
    ? "Edit Advance Request"
    : "Advance Request";

  if (!createMode && loading) {
    return (
      <GlobalWrapper title={title}>
        <CustomContainer title={title} filledHeader>
          <Flex justify="center" py="60px">
            <Spinner colorScheme="purple" />
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!createMode && !request) {
    return (
      <GlobalWrapper title={title}>
        <CustomContainer title={title} filledHeader>
          <Flex justify="center" py="60px">
            <Text color="gray.500">This advance request could not be found.</Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title={title}>
      <CustomContainer
        title={title}
        filledHeader
        rightSection={
          <Flex gap="10px" alignItems="center">
            {statusMeta && (
              <Badge colorScheme={statusMeta.colorScheme} fontSize="0.8em">
                {statusMeta.label}
              </Badge>
            )}
            {/* Correcting the details lives on its own route, and nothing
                on this page linked to it. */}
            {!createMode && !editMode && canEdit && isEditableStatus(status) && (
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                onClick={() =>
                  router.push(`/lr-workflow/advance-request/edit/${id}`)
                }
              >
                Edit
              </Button>
            )}
          </Flex>
        }
      >
        <Flex gap="22px" flexDirection="column">
          {isVisible("a1") && (
            <StageCard
              title="Stage - A1"
              editable={isEditable("a1")}
              initialValues={a1InitialValues}
              validationSchema={STAGE_SCHEMAS.a1}
              onSubmit={handleA1}
              submitLabel={createMode ? "Create" : "Update"}
              renderFields={({ editable }) => (
                <>
                  <Flex gap="12px">
                    <CustomInput
                      label="Supplier Name *"
                      name="distributor_code"
                      method="searchable-dropdown"
                      values={suppliers}
                      placeholder="Select Supplier"
                      editable={editable}
                    />
                    <CustomInput
                      label="Invoice No. / Proforma Invoice No."
                      name="invoice_number"
                      type="text"
                      editable={editable}
                    />
                  </Flex>

                  <Flex gap="12px">
                    <CustomInput
                      label="Amount *"
                      name="amount"
                      type="number"
                      editable={editable}
                    />
                    <CustomInput
                      label="Reason"
                      name="reason"
                      type="text"
                      editable={editable}
                    />
                  </Flex>

                  {editable && (
                    <CustomInput
                      label="Docs"
                      name="docs"
                      method="file"
                      multiple
                      editable={editable}
                    />
                  )}
                </>
              )}
            />
          )}

          {isVisible("a1.1") && (
            <StageCard
              title="Stage - A1.1"
              editable={isEditable("a1.1")}
              initialValues={a11InitialValues}
              validationSchema={STAGE_SCHEMAS["a1.1"]}
              onSubmit={handleA11}
              submitLabel="Save"
              renderFields={({ editable }) => (
                <>
                  <Flex gap="12px">
                    <CustomInput
                      label="Previous Advance Balance *"
                      name="previous_advance_balance"
                      type="number"
                      editable={editable}
                    />
                  </Flex>

                  <Flex gap="12px">
                    <CustomInput
                      label="Remarks"
                      name="balance_remarks"
                      type="text"
                      method="TextArea"
                      editable={editable}
                    />
                  </Flex>

                  {editable && (
                    <Text fontSize="sm" color="gray.500" mt="8px">
                      Enter 0 if the supplier holds nothing. Anything above 0
                      goes back to the purchase team to decide on.
                    </Text>
                  )}
                </>
              )}
            />
          )}

          {isVisible("a1.2") && (
            <StageCard
              title="Stage - A1.2"
              editable={isEditable("a1.2")}
              initialValues={a12InitialValues}
              validationSchema={STAGE_SCHEMAS["a1.2"]}
              onSubmit={handleA12}
              submitLabel="Send for Approval"
              renderFields={({ editable }) => (
                <>
                  <Flex gap="12px">
                    <CustomInput
                      label="Balance Decision *"
                      name="balance_action"
                      method="switch"
                      values={BALANCE_ACTIONS}
                      placeholder="Less and pay, or deduct next time"
                      editable={editable}
                    />
                  </Flex>

                  <Flex gap="12px">
                    <CustomInput
                      label="Note"
                      name="balance_action_note"
                      type="text"
                      method="TextArea"
                      editable={editable}
                    />
                  </Flex>

                  {editable && (
                    <Text fontSize="sm" color="gray.500" mt="8px">
                      The supplier already holds{" "}
                      {currencyFormatter(request?.previous_advance_balance || 0)}
                      . Less and pay deducts it from this payment; deduct next
                      time leaves it to settle later.
                    </Text>
                  )}
                </>
              )}
            />
          )}

          {isVisible("a2") && (
            <StageCard
              title="Stage - A2"
              editable={isEditable("a2")}
              initialValues={a2InitialValues}
              validationSchema={STAGE_SCHEMAS.a2}
              onSubmit={handleA2}
              submitLabel="Submit"
              renderFields={({ editable }) => (
                <>
                  <Flex gap="12px">
                    <CustomInput
                      label="Decision *"
                      name="decision"
                      method="switch"
                      values={APPROVAL_DECISIONS}
                      placeholder="Approve, hold or reject"
                      editable={editable}
                    />
                  </Flex>

                  {/* Re-clarifying a hold is the moment the admin settles
                      what happens to the old balance, so both go together. */}
                  {editable && heldByAdmin && (
                    <Flex gap="12px">
                      <CustomInput
                        label="Balance Decision"
                        name="balance_action"
                        method="switch"
                        values={BALANCE_ACTIONS}
                        placeholder="Leave as decided by purchase"
                        editable={editable}
                      />
                      <CustomInput
                        label="Balance Note"
                        name="balance_action_note"
                        type="text"
                        editable={editable}
                      />
                    </Flex>
                  )}

                  <Flex gap="12px">
                    <CustomInput
                      label="Note"
                      name="approval_note"
                      type="text"
                      method="TextArea"
                      editable={editable}
                    />
                  </Flex>
                </>
              )}
            />
          )}

          {isVisible("a3") && (
            <StageCard
              title="Stage - A3"
              editable={isEditable("a3")}
              initialValues={a3InitialValues}
              validationSchema={STAGE_SCHEMAS.a3}
              onSubmit={handleA3}
              submitLabel="Record Payment"
              renderFields={({ editable }) => (
                <>
                  <Flex gap="12px">
                    <CustomInput
                      label="Amount *"
                      name="paid_amount"
                      type="number"
                      editable={editable}
                    />
                    <CustomInput
                      label="UTR *"
                      name="utr"
                      type="text"
                      editable={editable}
                    />
                  </Flex>

                  <Flex gap="12px">
                    <CustomInput
                      label="Bank *"
                      name="bank_id"
                      method="switch"
                      values={banks}
                      placeholder="Select Bank"
                      editable={editable}
                    />
                    <CustomInput
                      label="Payment Date *"
                      name="payment_date"
                      method="datepicker"
                      editable={editable}
                    />
                  </Flex>

                  {editable && (
                    <CustomInput
                      label="Payment Advice *"
                      name="proof"
                      method="file"
                      editable={editable}
                    />
                  )}
                </>
              )}
            />
          )}

          {!createMode && request?.documents?.length > 0 && (
            <CustomContainer title="Documents" smallHeader>
              <Flex flexDirection="column" gap="8px">
                {request.documents.map((document) => (
                  <a
                    key={document.document_id}
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Text fontSize="sm" color="purple.600">
                      <i className="fa fa-file" />{" "}
                      {document.stage === "a3" ? "Payment advice" : "Document"}
                      {document.uploaded_by_name
                        ? ` — ${document.uploaded_by_name}`
                        : ""}
                    </Text>
                  </a>
                ))}
              </Flex>
            </CustomContainer>
          )}

          {!createMode && request?.activity?.length > 0 && (
            <CustomContainer title="History" smallHeader>
              <Flex flexDirection="column" gap="6px">
                {request.activity.map((entry) => (
                  <Text key={entry.activity_id} fontSize="sm" color="gray.600">
                    {moment(entry.created_at).format("DD/MM/YYYY HH:mm")} —{" "}
                    {entry.employee_name || "Someone"} changed {entry.field}
                    {entry.old_value ? ` from ${entry.old_value}` : ""} to{" "}
                    {entry.new_value}
                  </Text>
                ))}
              </Flex>
            </CustomContainer>
          )}
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AdvanceRequestForm;
