import React, { useMemo, useState } from "react";
import { Button, VStack, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomModal from "../CustomModal";
import CustomInput from "../customInput/customInput";
import { useRemarksMaster } from "../../customHooks/useRemarksMaster";
import { updatePurchaseReturnExtra } from "../../helper/purchaseReturn";
import toast from "react-hot-toast";

const OTHERS_VALUE = "others";

const validationSchema = Yup.object({
  reason_id: Yup.string(),
  custom_remark: Yup.string()
    .max(500, "At most 500 characters")
    .when("reason_id", {
      is: OTHERS_VALUE,
      then: (schema) => schema.trim(),
      otherwise: (schema) => schema.trim(),
    }),
});

/**
 * Modal to set or change the remark for a purchase return extra.
 * User can pick from remarks master (active) or "Others" and enter custom text.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object} row - Purchase return row (must have extra: status/no_of_boxes and mprh_pr_no)
 * @param {function} onSuccess - Called after successful save (e.g. refetch + onClose)
 */
function RemarkModal({ isOpen, onClose, row, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const { remarks } = useRemarksMaster();
  const activeRemarks = (remarks || []).filter(
    (r) => r.is_active === true || r.is_active === 1
  );

  const options = useMemo(
    () => [
      ...activeRemarks.map((r) => ({
        id: String(r.remark_id),
        value: r.label || `Remark ${r.remark_id}`,
      })),
      { id: OTHERS_VALUE, value: "Others" },
    ],
    [activeRemarks]
  );

  const initialValues = useMemo(() => {
    if (!row) return { reason_id: "", custom_remark: "" };
    const rid = row.remark_id;
    const freeText = row.remark;
    if (rid != null && rid !== "") {
      return { reason_id: String(rid), custom_remark: "" };
    }
    if (freeText != null && String(freeText).trim() !== "") {
      return {
        reason_id: OTHERS_VALUE,
        custom_remark: String(freeText).trim(),
      };
    }
    return { reason_id: "", custom_remark: "" };
  }, [row]);

  const handleSubmit = async (values) => {
    const prNo = row?.mprh_pr_no;
    if (!prNo) return;

    const isOthers = values.reason_id === OTHERS_VALUE;

    setSaving(true);
    try {
      if (isOthers) {
        const text = (values.custom_remark || "").trim();
        if (text.length > 500) {
          toast.error("Remark must be at most 500 characters");
          return;
        }
        await updatePurchaseReturnExtra(prNo, {
          remark: text || null,
          remark_id: null,
        });
        toast.success("Remark updated");
        onSuccess?.();
        onClose();
        return;
      }

      const remarkId = values.reason_id ? parseInt(values.reason_id, 10) : null;
      if (!remarkId) {
        toast.error("Please select a reason or enter a custom remark");
        return;
      }
      await updatePurchaseReturnExtra(prNo, {
        remark_id: remarkId,
        remark: null,
      });
      toast.success("Remark updated");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to update remark");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Set remark"
      size="sm"
      footer={
        <Button
          type="submit"
          form="remark-modal-form"
          colorScheme="purple"
          isLoading={saving}
          loadingText="Saving..."
        >
          Save
        </Button>
      }
    >
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, handleSubmit: formikSubmit }) => (
          <form id="remark-modal-form" onSubmit={formikSubmit}>
            <VStack align="stretch" spacing={4}>
              <CustomInput
                label="Reason"
                name="reason_id"
                method="switch"
                values={options}
                placeholder="Select reason or Others..."
                editable={true}
              />

              {values.reason_id === OTHERS_VALUE && (
                <>
                  <CustomInput
                    label="Custom remark"
                    name="custom_remark"
                    type="text"
                    method="TextArea"
                    height="100px"
                    placeholder="Enter remark (max 500 characters)"
                    editable={true}
                    maxLength={500}
                  />
                  {/* <Text fontSize="xs" color="gray.500" alignSelf="flex-start">
                    {(values.custom_remark || "").length}/500
                  </Text> */}
                </>
              )}
            </VStack>
          </form>
        )}
      </Formik>
    </CustomModal>
  );
}

export default RemarkModal;
