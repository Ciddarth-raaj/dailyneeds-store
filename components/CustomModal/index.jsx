import React from "react";
import {
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";

/**
 * Reusable Modal component with project theme (purple).
 * Use for consistent modal styling across the app.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Body content
 * @param {React.ReactNode} footer - Optional footer content
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
 * @param {boolean} isCentered - Center modal on screen
 * @param {string} scrollBehavior - 'inside' | 'outside'
 * @param {object} contentProps - Props passed to ModalContent
 * @param {object} bodyProps - Props passed to ModalBody
 */
function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  isCentered = true,
  scrollBehavior = "inside",
  contentProps = {},
  bodyProps = {},
  ...rest
}) {
  return (
    <ChakraModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      isCentered={isCentered}
      scrollBehavior={scrollBehavior}
      {...rest}
    >
      <ModalOverlay />
      <ModalContent
        borderRadius="xl"
        overflow="hidden"
        borderWidth="1px"
        borderColor="purple.100"
        h="max-content"
        {...contentProps}
      >
        {title != null && (
          <ModalHeader
            borderBottomWidth="1px"
            borderColor="purple.100"
            bg="purple.50"
            fontWeight="600"
            color="purple.700"
            fontSize="16px"
          >
            {title}
          </ModalHeader>
        )}
        <ModalCloseButton
          color="purple.600"
          _hover={{ color: "purple.700", bg: "purple.50" }}
        />
        <ModalBody bg="white" p="22px" {...bodyProps}>
          {children}
        </ModalBody>
        {footer != null && footer !== false && (
          <ModalFooter
            borderTopWidth="1px"
            borderColor="purple.100"
            bg="purple.50"
          >
            {footer}
          </ModalFooter>
        )}
      </ModalContent>
    </ChakraModal>
  );
}

export default CustomModal;
