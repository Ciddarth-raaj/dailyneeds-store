import React from "react";
import { Box, Image, chakra } from "@chakra-ui/react";

/**
 * The GRN Products table's Image cell: the same 48px thumbnail as before,
 * now a button that asks the page to show it large.
 */
function GrnProductThumbnail({ src, alt, onOpen }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" h="100%">
      <chakra.button
        type="button"
        title="Click to view larger image"
        aria-label={alt ? `View larger image of ${alt}` : "View larger image"}
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.(src, alt);
        }}
        p={0}
        m={0}
        bg="transparent"
        border="none"
        lineHeight={0}
        cursor="pointer"
        borderRadius="sm"
        transition="opacity 0.15s, box-shadow 0.15s"
        _hover={{ opacity: 0.8, boxShadow: "0 0 0 2px var(--chakra-colors-purple-300)" }}
        _focusVisible={{ outline: "none", boxShadow: "outline" }}
      >
        <Image
          src={src}
          alt=""
          sx={{
            maxWidth: "48px",
            maxHeight: "48px",
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
          borderRadius="sm"
        />
      </chakra.button>
    </Box>
  );
}

export default GrnProductThumbnail;
