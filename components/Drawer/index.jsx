import React from "react";
import {
  Drawer as ChakraDrawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/react";

/**
 * A reusable Drawer component built on Chakra UI Drawer.
 * Can be used anywhere in the app for consistent drawer behavior.
 *
 * @param {boolean} isOpen - Whether the drawer is open
 * @param {function} onClose - Callback when drawer closes
 * @param {string} placement - 'top' | 'right' | 'bottom' | 'left'
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {string} title - Header title
 * @param {React.ReactNode} children - Drawer body content
 * @param {React.ReactNode} footer - Optional footer content
 * @param {React.Ref} finalFocusRef - Ref to return focus to on close
 * @param {React.Ref} initialFocusRef - Ref to focus when opening
 */
function Drawer({
  isOpen,
  onClose,
  placement = "right",
  size = "md",
  title,
  children,
  footer,
  finalFocusRef,
  initialFocusRef,
  ...rest
}) {
  return (
    <ChakraDrawer
      isOpen={isOpen}
      placement={placement}
      onClose={onClose}
      size={size}
      finalFocusRef={finalFocusRef}
      initialFocusRef={initialFocusRef}
      {...rest}
    >
      <DrawerOverlay />
      <DrawerContent
        borderLeftWidth="1px"
        borderColor="purple.100"
        m={"22px"}
        borderRadius="10px"
        overflow="hidden"
      >
        <DrawerCloseButton
          color="purple.600"
          _hover={{ color: "purple.700", bg: "purple.50" }}
          mt="4px"
        />
        {title && (
          <DrawerHeader
            borderBottomWidth="1px"
            borderColor="purple.100"
            bg="purple.50"
            fontWeight="600"
            color="purple.700"
            fontSize="16px"
            mt="3px"
          >
            {title}
          </DrawerHeader>
        )}
        <DrawerBody bg="white">{children}</DrawerBody>
        {footer && (
          <DrawerFooter
            borderTopWidth="1px"
            borderColor="purple.100"
            bg="purple.50"
          >
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </ChakraDrawer>
  );
}

export default Drawer;
