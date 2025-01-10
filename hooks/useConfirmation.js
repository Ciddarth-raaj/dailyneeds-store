import { useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";

export function useConfirmation() {
  const toast = useToast();

  const confirm = useCallback(
    (message, options = {}) =>
      new Promise((resolve) => {
        const {
          title = "Confirm Action",
          confirmText = "Confirm",
          cancelText = "Cancel",
          type = "warning",
          ...rest
        } = options;

        const id = "confirm-toast"; // Unique ID for the toast

        // Close any existing confirmation dialogs
        toast.close(id);

        toast({
          id,
          position: "top",
          duration: null,
          render: ({ onClose }) => (
            <AlertDialog
              isOpen={true}
              onClose={() => {
                onClose();
                resolve(false);
              }}
              {...rest}
            >
              <AlertDialogOverlay>
                <AlertDialogContent>
                  <AlertDialogHeader fontSize="lg" fontWeight="bold">
                    {title}
                  </AlertDialogHeader>

                  <AlertDialogBody>{message}</AlertDialogBody>

                  <AlertDialogFooter>
                    <Button
                      onClick={() => {
                        onClose();
                        resolve(false);
                      }}
                    >
                      {cancelText}
                    </Button>
                    <Button
                      colorScheme="purple"
                      ml={3}
                      onClick={() => {
                        onClose();
                        resolve(true);
                      }}
                    >
                      {confirmText}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialogOverlay>
            </AlertDialog>
          ),
        });
      }),
    [toast]
  );

  return { confirm };
}
