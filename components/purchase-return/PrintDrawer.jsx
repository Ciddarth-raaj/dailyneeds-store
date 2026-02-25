import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  Button,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  VStack,
  Divider,
  Heading,
} from "@chakra-ui/react";
import {
  createPurchaseReturnExtra,
  updatePurchaseReturnExtra,
} from "../../helper/purchaseReturn";
import { downloadPurchaseReturnLabelsPdf } from "../../helper/purchaseReturnLabelsPdf";
import toast from "react-hot-toast";
import moment from "moment";
import Drawer from "../Drawer";

/**
 * Print drawer for purchase return: show PR details, edit no_of_boxes, then Done to save (create or update extra).
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object} row - Selected purchase return row (from list)
 * @param {function} refetch - Callback to refetch list after save
 * @param {string|number} [employeeId] - Current user's employee ID for created_by on create
 * @param {string} [currentUserName] - Current user's display name when creating
 */
function PrintDrawer({
  isOpen,
  onClose,
  row,
  refetch,
  employeeId,
  currentUserName = "—",
}) {
  const [noOfBoxes, setNoOfBoxes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row && isOpen) {
      const existing = row.no_of_boxes;
      setNoOfBoxes(existing != null && existing !== "" ? Number(existing) : "");
    }
  }, [row, isOpen]);

  const handleClose = useCallback(() => {
    setNoOfBoxes("");
    onClose();
  }, [onClose]);

  const createdByName = row
    ? row.status != null || row.no_of_boxes != null
      ? row.created_by_name ?? "—"
      : currentUserName
    : "—";

  const boxesNum = Number(noOfBoxes);
  const hasValidBoxes = !isNaN(boxesNum) && boxesNum >= 1;
  const hasExtra = row?.status != null || row?.no_of_boxes != null;
  const existingBoxes = hasExtra ? Number(row.no_of_boxes) : null;
  const valueUnchanged =
    hasExtra &&
    existingBoxes != null &&
    !isNaN(boxesNum) &&
    boxesNum === existingBoxes;

  const handleDone = useCallback(async () => {
    if (!row?.mprh_pr_no || !hasValidBoxes) return;
    const prNo = row.mprh_pr_no;
    const boxes = boxesNum;

    setSaving(true);
    try {
      if (!valueUnchanged) {
        if (!hasExtra) {
          await createPurchaseReturnExtra({
            mprh_pr_no: String(prNo),
            no_of_boxes: boxes,
            status: "open",
          });
          toast.success("Created");
        } else {
          await updatePurchaseReturnExtra(prNo, { no_of_boxes: boxes });
          toast.success("Updated");
        }
        await refetch();
      }
      downloadPurchaseReturnLabelsPdf(row, boxes, {
        enteredBy: createdByName || currentUserName || "—",
        print: true,
      });
      handleClose();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [
    row,
    hasValidBoxes,
    boxesNum,
    valueUnchanged,
    hasExtra,
    refetch,
    handleClose,
    createdByName,
    currentUserName,
  ]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Print"
      size="sm"
      footer={
        <Button
          colorScheme="purple"
          onClick={handleDone}
          isLoading={saving}
          loadingText="Saving..."
          isDisabled={!hasValidBoxes}
        >
          Print
        </Button>
      }
    >
      {row && (
        <Box as="form" onSubmit={(e) => e.preventDefault()}>
          <VStack align="stretch" spacing={5}>
            <Box
              bg="gray.50"
              borderRadius="md"
              p={4}
              borderWidth="1px"
              borderColor="gray.100"
            >
              <Heading
                size="xs"
                color="gray.600"
                mb={3}
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Purchase return
              </Heading>
              <VStack align="stretch" spacing={3}>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    Supplier name
                  </Text>
                  <Text fontSize="md" fontWeight="500" color="gray.800">
                    {row.distributor_name ?? "—"}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    PRN No
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="600"
                    color="purple.700"
                    fontFamily="mono"
                  >
                    {row.mprh_pr_refno ?? "—"}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    PRN date
                  </Text>
                  <Text fontSize="md" fontWeight="500" color="gray.800">
                    {row.mprh_pr_dt
                      ? moment(row.mprh_pr_dt).format("DD MMM YYYY")
                      : "—"}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    Created by
                  </Text>
                  <Text fontSize="md" fontWeight="500" color="gray.800">
                    {createdByName}
                  </Text>
                </Box>
              </VStack>
            </Box>

            <Divider />

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color="gray.700">
                No. of boxes
              </FormLabel>
              <NumberInput
                value={noOfBoxes === "" ? "" : noOfBoxes}
                onChange={(_, val) => {
                  if (val === undefined || val === "") setNoOfBoxes("");
                  else setNoOfBoxes(isNaN(val) ? "" : Number(val));
                }}
                min={1}
                size="md"
                placeholder=""
              >
                <NumberInputField focusBorderColor="purple.400" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </VStack>
        </Box>
      )}
    </Drawer>
  );
}

export default PrintDrawer;
