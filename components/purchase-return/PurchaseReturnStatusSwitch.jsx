import React from "react";
import { Switch } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { updatePurchaseReturnExtra } from "../../helper/purchaseReturn";

/**
 * Reusable status switch for a purchase return row. Handles API update and toast.
 * @param {Object} props
 * @param {Object} props.row - Row with mprh_pr_no and status
 * @param {function} props.onSuccess - Callback after successful update (e.g. refetch)
 */
function PurchaseReturnStatusSwitch({ row, onSuccess }) {
  const prNo = row?.mprh_pr_no;
  const status = row?.status;
  const isDone = status === "done";

  if (status == null) {
    return null;
  }

  const handleChange = () => {
    if (!prNo) return;
    const newStatus = isDone ? "open" : "done";
    toast.promise(
      updatePurchaseReturnExtra(prNo, { status: newStatus }).then(() => {
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
