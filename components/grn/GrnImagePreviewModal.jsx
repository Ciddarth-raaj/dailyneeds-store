import React, { useEffect, useState } from "react";
import {
  Box,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  chakra,
} from "@chakra-ui/react";

/**
 * A product image, large, over the GRN page - view only.
 *
 * Chakra's Modal supplies Esc and the backdrop close; the content box is
 * sized to the image itself, so a click anywhere that is not the image (or
 * the "Image not available" card) lands on the backdrop and closes it. The
 * image keeps its aspect ratio and never exceeds the viewport.
 */
function GrnImagePreviewModal({ isOpen, onClose, src, alt }) {
  const [failed, setFailed] = useState(false);

  // A new image gets a fresh attempt, even after the last one failed.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const unavailable = failed || !src;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="full">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent
        aria-label={alt ? `${alt} image` : "Product image"}
        bg="transparent"
        boxShadow="none"
        w="auto"
        h="auto"
        minH="auto"
        maxW="90vw"
        maxH="90vh"
        m="auto"
        position="relative"
      >
        <ModalCloseButton
          aria-label="Close image preview"
          top="-14px"
          right="-14px"
          size="md"
          bg="white"
          borderRadius="full"
          boxShadow="md"
          _hover={{ bg: "gray.100" }}
          zIndex={1}
        />
        {unavailable ? (
          <Box
            bg="white"
            borderRadius="md"
            px={10}
            py={8}
            textAlign="center"
            data-testid="grn-image-unavailable"
          >
            <Text color="gray.600" fontWeight="medium">
              Image not available
            </Text>
          </Box>
        ) : (
          <chakra.img
            src={src}
            alt={alt || "Product image"}
            onError={() => setFailed(true)}
            display="block"
            maxW="90vw"
            maxH="90vh"
            w="auto"
            h="auto"
            objectFit="contain"
            bg="white"
            borderRadius="md"
          />
        )}
      </ModalContent>
    </Modal>
  );
}

export default GrnImagePreviewModal;
