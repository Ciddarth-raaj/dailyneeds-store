import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
} from "@chakra-ui/react";

function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete",
  body = "Are you sure you want to delete this item?",
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{body}</ModalBody>
        <ModalFooter>
          <Button
            colorScheme="gray"
            mr={3}
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button colorScheme="red" onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ConfirmDeleteModal;
