import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import { Badge, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import CustomInput from "../../../components/customInput/customInput";
import usePeople from "../../../customHooks/usePeople";
import usePermissions from "../../../customHooks/usePermissions";
import useAdvanceRequestById from "../../../customHooks/useAdvanceRequestById";
import asset from "../../../helper/asset";
import toast from "react-hot-toast";
import moment from "moment";
import * as Yup from "yup";
import {
  STAGE_MAP,
  getCurrentStage,
  getStatusMeta,
  isEditableStatus,
  isTerminal,
} from "../../../constants/advanceRequest";
import {
  createAdvanceRequest,
  updateAdvanceRequest,
  submitBalanceCheck,
  submitApproval,
  submitPayment,
  addAdvanceRequestDocument,
} from "../../../helper/advanceRequest";

/** person_type 2 is a supplier, 6 is a bank — both live in people_list. */
const SUPPLIER_TYPE = 2;
const BANK_TYPE = 6;

/**
 * Each stage collects its own fields, so each needs its own schema. These
 * mirror the Joi schemas the API validates against; the API is what actually
 * decides, this is only so the user hears about it sooner.
 */
const STAGE_SCHEMAS = {
  a1: Yup.object({
    purchase_order_number: Yup.string()
      .required("Purchase Order Number is required")
      .max(100, "Purchase Order Number cannot exceed 100 characters"),
    supplier_id: Yup.number()
      .typeError("Select a Supplier")
      .required("Supplier is required"),
    amount: Yup.number()
      .typeError("Amount must be a number")
      .required("Amount is required")
      .min(0.01, "Amount must be greater than 0"),
    reason: Yup.string()
      .required("Reason is required")
      .max(500, "Reason cannot exceed 500 characters"),
    docs: Yup.mixed().optional(),
  }),
  "a1.1": Yup.object({
    pending_bills: Yup.number()
      .typeError("Pending Bills must be a number")
      .required("Pending Bills is required")
      .min(0, "Pending Bills cannot be negative"),
    previous_advance_balance: Yup.number()
      .typeError("Previous Advance Balance must be a number")
      .required("Previous Advance Balance is required")
      .min(0, "Previous Advance Balance cannot be negative"),
    balance_remarks: Yup.string()
      .required("Remarks is required")
      .max(500, "Remarks cannot exceed 500 characters"),
    on_hold: Yup.boolean().optional(),
  }),
  a2: Yup.object({
    approval_status: Yup.number()
      .typeError("Select an Approval Status")
      .required("Approval Status is required")
      .oneOf([0, 1], "Select an Approval Status"),
    approval_note: Yup.string().max(500, "Note cannot exceed 500 characters"),
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
    proof: Yup.mixed().required("Proof of Payment is required"),
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

  const suppliers = useMemo(
    () =>
      peopleList
        .filter((item) => item.person_type === SUPPLIER_TYPE)
        .map((item) => ({ id: item.person_id, value: item.name })),
    [peopleList]
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

  const status = request?.status;
  const terminal = isTerminal(status);

  // A new request is at A1; an existing one is wherever its status says.
  const currentStage = createMode ? "a1" : getCurrentStage(status);

  const stagePermission = {
    a1: false,
    "a1.1": canCheckBalance,
    a2: canApprove,
    a3: canPay,
  };

  /** Every stage up to and including the one the request has reached. */
  const isVisible = (stage) => {
    if (createMode) return stage === "a1";
    if (!request) return false;
    return STAGE_MAP[stage] <= STAGE_MAP[currentStage];
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
      purchase_order_number: request?.purchase_order_number ?? "",
      supplier_id: request?.supplier_id ?? null,
      amount: request?.amount ?? null,
      reason: request?.reason ?? "",
      docs: null,
    }),
    [request]
  );

  const handleA1 = async (values) => {
    try {
      const payload = {
        purchase_order_number: values.purchase_order_number,
        supplier_id: Number(values.supplier_id),
        amount: Number(values.amount),
        reason: values.reason,
      };

      if (createMode) {
        const created = unwrap(await createAdvanceRequest(payload));
        const newId = created.advance_request_id;

        await attachDocuments(values.docs, newId, "a1");

        toast.success("Advance request created");
        router.push(`/lr-workflow/advance-request/view/${newId}`);
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
      pending_bills: request?.pending_bills ?? null,
      previous_advance_balance: request?.previous_advance_balance ?? null,
      balance_remarks: request?.balance_remarks ?? "",
      on_hold: status === "on_hold",
    }),
    [request, status]
  );

  const handleA11 = async (values) => {
    try {
      unwrap(
        await submitBalanceCheck(id, {
          pending_bills: Number(values.pending_bills),
          previous_advance_balance: Number(values.previous_advance_balance),
          balance_remarks: values.balance_remarks,
          on_hold: Boolean(values.on_hold),
        })
      );

      toast.success(
        values.on_hold ? "Request put on hold" : "Balance check recorded"
      );
      refetch();
    } catch (err) {
      reportError(err);
    }
  };

  // ------------------------------------------------------------------ A2

  const a2InitialValues = useMemo(
    () => ({
      approval_status: request?.approval_status ?? null,
      approval_note: request?.approval_note ?? "",
    }),
    [request]
  );

  const handleA2 = async (values) => {
    try {
      unwrap(
        await submitApproval(id, {
          approval_status: Number(values.approval_status),
          approval_note: values.approval_note || "",
        })
      );

      toast.success(
        Number(values.approval_status) === 1 ? "Request approved" : "Request rejected"
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
          statusMeta ? (
            <Badge colorScheme={statusMeta.colorScheme} fontSize="0.8em">
              {statusMeta.label}
            </Badge>
          ) : null
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
                      label="Purchase Order Number *"
                      name="purchase_order_number"
                      type="text"
                      editable={editable}
                    />
                    <CustomInput
                      label="Supplier Name *"
                      name="supplier_id"
                      method="switch"
                      values={suppliers}
                      placeholder="Select Supplier"
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
                      label="Reason *"
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
                      label="Pending Bills *"
                      name="pending_bills"
                      type="number"
                      editable={editable}
                    />
                    <CustomInput
                      label="Previous Advance Balance *"
                      name="previous_advance_balance"
                      type="number"
                      editable={editable}
                    />
                  </Flex>

                  <Flex gap="12px">
                    <CustomInput
                      label="Remarks *"
                      name="balance_remarks"
                      type="text"
                      method="TextArea"
                      editable={editable}
                    />
                  </Flex>

                  {editable && (
                    <CustomInput
                      label="Put on hold instead of sending for approval"
                      name="on_hold"
                      method="switch_toggle"
                      editable={editable}
                    />
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
                      label="Approval Status *"
                      name="approval_status"
                      method="switch"
                      values={[
                        { id: 1, value: "Approved" },
                        { id: 0, value: "Rejected" },
                      ]}
                      editable={editable}
                    />
                  </Flex>

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
                      label="Proof of Payment *"
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
                      {document.stage === "a3" ? "Proof of payment" : "Document"}
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
