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
  Text,
} from "@chakra-ui/react";

/**
 * The confirmation in front of "Verify & Accept GRN".
 *
 * Its own component rather than ConfirmDeleteModal: that one is a red,
 * destructive dialog, and this approves rather than destroys. The approval
 * covers the WHOLE GRN, which is why the reference number is spelled out
 * here - it is the key the verification is recorded against.
 */
function GrnVerifyConfirmModal({ isOpen, onClose, onConfirm, refno, isLoading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Verify & Accept GRN</ModalHeader>
        <ModalCloseButton disabled={isLoading} />
        <ModalBody>
          <Text>Confirm that this GRN has been checked and verified?</Text>
          {refno ? (
            <Text fontSize="sm" color="gray.500" mt={2}>
              This applies to the entire GRN {refno}, and cannot be undone here.
            </Text>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="gray" mr={3} onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={onConfirm} isLoading={isLoading}>
            Verify & Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default GrnVerifyConfirmModal;
