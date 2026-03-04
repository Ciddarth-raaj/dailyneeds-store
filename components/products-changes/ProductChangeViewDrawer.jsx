import React, { useState } from "react";
import { Button, VStack, Text, Box, SimpleGrid } from "@chakra-ui/react";
import Drawer from "../Drawer";
import toast from "react-hot-toast";
import { capitalize } from "../../util/string";

/**
 * Drawer to view a product change record: list of field changes (old → new)
 * and an Approve button in the footer.
 */
function ProductChangeViewDrawer({ isOpen, onClose, row, onApprove, refetch }) {
  const [approving, setApproving] = useState(false);

  const changes =
    row?.changes && typeof row.changes === "object" ? row.changes : {};
  const entries = Object.entries(changes);

  const handleApprove = async () => {
    if (!row?.products_change_id) return;
    setApproving(true);
    try {
      await onApprove(row.products_change_id, true);
      toast.success("Change approved");
      refetch?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const formatValue = (v) => {
    if (v == null) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Product change: ${row?.product_id ?? ""}`}
      size="md"
      footer={
        !row?.is_approved && (
          <Button
            colorScheme="purple"
            size="sm"
            onClick={handleApprove}
            isLoading={approving}
          >
            Approve
          </Button>
        )
      }
    >
      <VStack align="stretch" spacing={4}>
        {entries.length === 0 ? (
          <Text color="gray.600">No change details.</Text>
        ) : (
          <SimpleGrid columns={1} spacing={3}>
            {entries.map(([field, value]) => {
              const oldVal = value?.old;
              const newVal = value?.new;
              return (
                <Box
                  key={field}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200"
                  bg="gray.50"
                >
                  <Text
                    fontWeight="600"
                    fontSize="sm"
                    color="purple.700"
                    mb={2}
                  >
                    {capitalize(field.replaceAll("_", " "))}
                  </Text>
                  <SimpleGrid columns={2} spacing={2} fontSize="sm">
                    <Box>
                      <Text color="gray.500">Old</Text>
                      <Text>{formatValue(oldVal)}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500">New</Text>
                      <Text>{formatValue(newVal)}</Text>
                    </Box>
                  </SimpleGrid>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </VStack>
    </Drawer>
  );
}

export default ProductChangeViewDrawer;
