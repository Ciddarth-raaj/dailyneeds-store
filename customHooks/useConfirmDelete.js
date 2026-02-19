import React, { useCallback, useRef, useState } from "react";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

/**
 * Hook to trigger a confirmation dialog before running a delete (or any) action.
 * Returns { confirmDelete, ConfirmDeleteDialog }.
 *
 * Usage:
 *   const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
 *   // Render once: <ConfirmDeleteDialog />
 *   // Trigger: confirmDelete({ title?: string, message?: string, onConfirm: async () => { ... } })
 */
export function useConfirmDelete() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("Delete");
  const [message, setMessage] = useState("Are you sure you want to delete this item?");
  const [isLoading, setIsLoading] = useState(false);
  const onConfirmRef = useRef(null);

  const confirmDelete = useCallback((options = {}) => {
    setTitle(options.title ?? "Delete");
    setMessage(options.message ?? "Are you sure you want to delete this item?");
    onConfirmRef.current = options.onConfirm ?? (() => Promise.resolve());
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      const fn = onConfirmRef.current;
      if (typeof fn === "function") await fn();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false);
      onConfirmRef.current = null;
    }
  }, [isLoading]);

  const ConfirmDeleteDialog = useCallback(
    () => (
      <ConfirmDeleteModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={title}
        body={message}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isLoading}
      />
    ),
    [isOpen, title, message, isLoading, handleClose, handleConfirm]
  );

  return { confirmDelete, ConfirmDeleteDialog };
}
