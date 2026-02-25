import React from "react";
import {
  Box,
  Text,
  Flex,
  Button,
  Badge,
  VStack,
  SimpleGrid,
} from "@chakra-ui/react";
import Link from "next/link";
import { capitalize } from "../../util/string";
import currencyFormatter from "../../util/currencyFormatter";
import PurchaseReturnStatusSwitch from "./PurchaseReturnStatusSwitch";

/**
 * Mobile card list for purchase returns. Reuses PurchaseReturnStatusSwitch.
 * @param {Object} props
 * @param {Array} props.rows - Table rows (mprh_pr_no, mprh_pr_refno, total_qty, total_amount, no_of_boxes, status)
 * @param {Array} props.purchaseReturns - Full PR objects (for View products payload)
 * @param {boolean} props.canAdd - Whether to show status switch
 * @param {function} props.onViewProducts - (pr) => void when "View products" is clicked
 * @param {function} props.onStatusSuccess - Callback after status update (refetch)
 * @param {number|null|undefined} props.purchaseAcknowledgementId - When on purchase ack page, pass to link PR to acknowledgement when marking done
 */
function PurchaseReturnsMobileCards({
  rows = [],
  purchaseReturns = [],
  canAdd,
  onViewProducts,
  onStatusSuccess,
  purchaseAcknowledgementId,
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={4}>
      {rows.map((row) => {
        const fullPr = purchaseReturns.find(
          (p) => p.mprh_pr_no === row.mprh_pr_no
        );
        const prForModal = fullPr || row;
        const amountDisplay =
          row.total_amount != null && row.total_amount !== "—"
            ? currencyFormatter(row.total_amount)
            : "—";
        const status = row?.status;

        return (
          <Box
            key={row.mprh_pr_no}
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            p={4}
            bg="white"
            shadow="sm"
          >
            <VStack align="stretch" spacing={3}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <Text fontWeight="600" fontSize="md" color="purple.700">
                  {row.mprh_pr_refno ?? "—"}
                </Text>
                {status != null && (
                  <Badge
                    colorScheme={status === "done" ? "green" : "blue"}
                    fontSize="xs"
                  >
                    {capitalize(status)}
                  </Badge>
                )}
              </Flex>

              <SimpleGrid columns={2} spacing={2} fontSize="sm">
                <Text color="gray.600">Total Qty</Text>
                <Text fontWeight="500">{row.total_qty ?? "—"}</Text>
                <Text color="gray.600">Total Amount</Text>
                <Text fontWeight="500">{amountDisplay}</Text>
                <Text color="gray.600">No. of Boxes</Text>
                <Text fontWeight="500">{row.no_of_boxes ?? "—"}</Text>
              </SimpleGrid>

              {canAdd && status != null && (
                <Flex align="center" gap={2}>
                  <Text fontSize="sm" color="gray.600">
                    Status
                  </Text>
                  <PurchaseReturnStatusSwitch
                    row={row}
                    onSuccess={onStatusSuccess}
                    purchaseAcknowledgementId={purchaseAcknowledgementId}
                  />
                </Flex>
              )}

              <Flex gap={2} wrap="wrap" pt={1}>
                <Link
                  href={`/purchase/purchase-return/view?mprh_pr_no=${encodeURIComponent(
                    row.mprh_pr_no
                  )}`}
                  passHref
                >
                  <Button size="sm" variant="outline" colorScheme="purple" as="a">
                    View
                  </Button>
                </Link>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  leftIcon={<i className="fa-solid fa-list" />}
                  onClick={() => onViewProducts?.(prForModal)}
                >
                  View products
                </Button>
              </Flex>
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
}

export default PurchaseReturnsMobileCards;
