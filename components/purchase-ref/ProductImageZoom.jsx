import React, { useState } from "react";
import {
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
} from "@chakra-ui/react";

/**
 * Thumbnail that opens a full-size, click-to-zoom modal preview on click.
 * @param {Object} props
 * @param {string} props.src
 * @param {string} [props.thumbSize]
 */
function ProductImageZoom({ src, thumbSize = "48px" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (!src) return null;

  const handleClose = () => {
    setIsOpen(false);
    setZoomed(false);
  };

  return (
    <>
      <Image
        src={src}
        alt=""
        boxSize={thumbSize}
        objectFit="contain"
        borderRadius="sm"
        cursor="pointer"
        loading="lazy"
        onClick={() => setIsOpen(true)}
      />
      {/* Mounted only while open: this renders once per row, and a list of
          them would otherwise carry a full modal tree per product. */}
      {isOpen && (
        <Modal isOpen onClose={handleClose} isCentered size="xl">
          <ModalOverlay />
          <ModalContent
            bg="transparent"
            boxShadow="none"
            maxW={zoomed ? "none" : "2xl"}
          >
            <ModalCloseButton
              color="white"
              bg="blackAlpha.600"
              borderRadius="full"
              _hover={{ bg: "blackAlpha.800" }}
            />
            <ModalBody
              p={0}
              display="flex"
              justifyContent={zoomed ? "flex-start" : "center"}
              alignItems={zoomed ? "flex-start" : "center"}
              overflow={zoomed ? "auto" : "hidden"}
              maxH="90vh"
            >
              <Image
                src={src}
                alt=""
                maxW={zoomed ? "none" : "100%"}
                maxH={zoomed ? "none" : "90vh"}
                w={zoomed ? "200%" : "auto"}
                cursor={zoomed ? "zoom-out" : "zoom-in"}
                onClick={() => setZoomed((z) => !z)}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

export default ProductImageZoom;
