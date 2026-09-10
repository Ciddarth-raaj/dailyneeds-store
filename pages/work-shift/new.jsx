import React, { useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WorkShiftForm from "../../components/work-shift/WorkShiftForm";
import useWorkShiftForm from "../../customHooks/useWorkShiftForm";
import usePermissions from "../../customHooks/usePermissions";
import WorkShiftHelper from "../../helper/workShift";
import { toCreatePayload } from "../../util/workShiftForm";

/**
 * Add Work Shift.
 *
 * The shift and its complete seven-day schedule are created in ONE request,
 * because the backend writes them in one transaction and refuses a create
 * without the week. There is no "save the shift now, fill in the days later":
 * a half-defined shift is precisely the state payroll must never read.
 */
function AddWorkShift() {
  const router = useRouter();
  const toast = useToast();
  const canManage = usePermissions(["manage_work_shifts"]);

  const { form, errors, rowErrors, messages, change, changeRow, copyDay, validate } =
    useWorkShiftForm();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const submit = async () => {
    setServerError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await WorkShiftHelper.createWorkShift(toCreatePayload(form));
      if (!res || res.code !== 200) {
        // 422 carries the backend's own validation text, 101 a duplicate
        // shift code. Both are worth reading, so neither is flattened into
        // "something went wrong".
        setServerError((res && res.msg) || "The work shift could not be created");
        return;
      }
      toast({ title: "Work shift created", status: "success", duration: 3000 });
      router.push(`/work-shift/${res.work_shift_id}`);
    } catch (err) {
      console.log(err);
      setServerError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalWrapper title="Add Work Shift" permissionKey={["view_work_shifts"]}>
      {!canManage ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          You do not have permission to add a work shift.
        </Alert>
      ) : (
        <WorkShiftForm
          title="Add Work Shift"
          subtitle="Shift Code and Shift Name are required. All seven days are saved with the shift."
          form={form}
          errors={errors}
          rowErrors={rowErrors}
          messages={messages}
          serverError={serverError}
          saving={saving}
          onChange={change}
          onRowChange={changeRow}
          onCopyDay={copyDay}
          onSubmit={submit}
        />
      )}
    </GlobalWrapper>
  );
}

export default AddWorkShift;
