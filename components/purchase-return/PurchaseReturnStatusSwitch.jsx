import React from "react";
import { Switch } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { updatePurchaseReturnExtra } from "../../helper/purchaseReturn";

/**
 * Reusable status switch for a purchase return row. Handles API update and toast.
 * When purchaseAcknowledgementId is provided (e.g. on purchase ack page), sends it
 * when setting status to "done", and null when setting to "open".
 * @param {Object} props
 * @param {Object} props.row - Row with mprh_pr_no and status
 * @param {function} props.onSuccess - Callback after successful update (e.g. refetch)
 * @param {number|null|undefined} props.purchaseAcknowledgementId - When on purchase ack page, the acknowledgement id to link when marking done; omitted/null when not on that page or when marking open.
 */
function PurchaseReturnStatusSwitch({ row, onSuccess, purchaseAcknowledgementId }) {
  const prNo = row?.mprh_pr_no;
  const status = row?.status;
  const isDone = status === "done";

  if (status == null) {
    return null;
  }

  const handleChange = () => {
    if (!prNo) return;
    const newStatus = isDone ? "open" : "done";
    const payload = {
      status: newStatus,
      purchase_acknowledgement_id:
        newStatus === "done" && purchaseAcknowledgementId != null
          ? purchaseAcknowledgementId
          : null,
    };
    toast.promise(
      updatePurchaseReturnExtra(prNo, payload).then(() => {
        onSuccess?.();
      }),
      {
        loading: "Updating status...",
        success: `Status set to ${newStatus === "done" ? "Done" : "Open"}`,
        error: (err) => err.message || "Failed to update status",
      }
    );
  };

  return (
    <Switch
      size="sm"
      colorScheme="purple"
      isChecked={isDone}
      onChange={handleChange}
    />
  );
}

export default PurchaseReturnStatusSwitch;
