import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WorkShiftForm from "../../components/work-shift/WorkShiftForm";
import useWorkShiftForm from "../../customHooks/useWorkShiftForm";
import usePermissions from "../../customHooks/usePermissions";
import WorkShiftHelper from "../../helper/workShift";
import { fromApiWorkShift, toUpdatePayload } from "../../util/workShiftForm";

/**
 * Edit Work Shift.
 *
 * Loaded from /work-shift/details, which returns the configuration AND the
 * seven weekly rows in one read — asking for them separately would let the
 * two halves of one screen disagree with each other.
 *
 * Saved the same way: configuration and schedule go in a single /work-shift/
 * update call and are written in one transaction, so a failure in either half
 * leaves neither written.
 */
function EditWorkShift() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const canManage = usePermissions(["manage_work_shifts"]);

  const {
    form,
    errors,
    rowErrors,
    messages,
    replace,
    change,
    changeRow,
    copyDay,
    validate,
  } = useWorkShiftForm();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const load = useCallback(
    async (workShiftId) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await WorkShiftHelper.getWorkShiftDetails(workShiftId);
        if (!res || res.code !== 200 || !res.data) {
          setLoadError((res && res.msg) || "This work shift could not be loaded");
          return;
        }
        replace(fromApiWorkShift(res.data));
      } catch (err) {
        console.log(err);
        setLoadError("Could not reach the server");
      } finally {
        setLoading(false);
      }
    },
    [replace]
  );

  useEffect(() => {
    // `router.query` is empty on the first render of a dynamic route.
    if (!router.isReady || id === undefined) return;
    load(id);
  }, [router.isReady, id, load]);

  const submit = async () => {
    setServerError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await WorkShiftHelper.updateWorkShift(toUpdatePayload(id, form));
      if (!res || res.code !== 200) {
        setServerError((res && res.msg) || "The work shift could not be saved");
        return;
      }
      toast({ title: "Work shift saved", status: "success", duration: 3000 });
      router.push("/work-shift");
    } catch (err) {
      console.log(err);
      setServerError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalWrapper title="Edit Work Shift" permissionKey={["view_work_shifts"]} loading={loading}>
      {loadError ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {loadError}
        </Alert>
      ) : (
        <>
          {!canManage ? (
            <Alert status="info" fontSize="sm" mb={3}>
              <AlertIcon />
              You do not have permission to change a work shift. This is a read of the
              current configuration.
            </Alert>
          ) : null}
          <WorkShiftForm
            title={form.shift_name || "Work Shift"}
            subtitle={form.shift_code ? `Shift Code ${form.shift_code}` : undefined}
            form={form}
            errors={errors}
            rowErrors={rowErrors}
            messages={messages}
            serverError={serverError}
            saving={saving}
            canSubmit={canManage}
            onChange={change}
            onRowChange={changeRow}
            onCopyDay={copyDay}
            onSubmit={submit}
          />
        </>
      )}
    </GlobalWrapper>
  );
}

export default EditWorkShift;
