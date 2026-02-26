import React, { useState, useCallback } from "react";
import RemarkModal from "./RemarkModal";

/**
 * Hook to get the Remark action and modal. Use when you need getRemarkAction in useMemo (e.g. PA form).
 * @param {function} onSuccess - Called after remark is saved (e.g. refetch)
 * @returns {{ getRemarkAction: (row) => action, RemarkModalComponent: React.FC }}
 */
export function useRemarkModal(onSuccess) {
  const [remarkModalRow, setRemarkModalRow] = useState(null);

  const openRemark = useCallback((row) => setRemarkModalRow(row), []);
  const closeRemark = useCallback(() => setRemarkModalRow(null), []);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    closeRemark();
  }, [onSuccess, closeRemark]);

  const getRemarkAction = useCallback(
    (row) => ({
      label: "Remark",
      icon: "fa-solid fa-comment-dots",
      colorScheme: "blue",
      onClick: () => openRemark(row),
    }),
    [openRemark]
  );

  const RemarkModalComponent = useCallback(
    () => (
      <RemarkModal
        isOpen={remarkModalRow != null}
        onClose={closeRemark}
        row={remarkModalRow}
        onSuccess={handleSuccess}
      />
    ),
    [remarkModalRow, closeRemark, handleSuccess]
  );

  return { getRemarkAction, RemarkModalComponent };
}

/**
 * Provides the Remark action (for AgGrid action-icons) and the Remark modal via render prop.
 * Use when the content that needs getRemarkAction can be wrapped (e.g. Purchase Return list).
 *
 * @param {function} onSuccess - Called after remark is saved (e.g. refetch)
 * @param {function} children - Render prop: (getRemarkAction) => ReactNode
 */
function PurchaseReturnRemarkAction({ onSuccess, children }) {
  const { getRemarkAction, RemarkModalComponent } = useRemarkModal(onSuccess);
  return (
    <>
      <RemarkModalComponent />
      {children(getRemarkAction)}
    </>
  );
}

export default PurchaseReturnRemarkAction;
