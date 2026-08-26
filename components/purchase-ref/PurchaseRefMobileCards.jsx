import React from "react";
import { Box, Text, Flex, Badge, VStack, SimpleGrid } from "@chakra-ui/react";
import { capitalize } from "../../util/string";
import currencyFormatter from "../../util/currencyFormatter";

/**
 * Mobile card list for the Purchase Ref page.
 * @param {Object} props
 * @param {Array} props.rows - product_id, name, supplier_name, mrp, net_cost, avg_sales
 */
function PurchaseRefMobileCards({ rows = [] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={3}>
      {rows.map((row) => {
        const mrpDisplay =
          row.mrp != null ? currencyFormatter(row.mrp) : "—";
        const netCostDisplay =
          row.net_cost != null ? currencyFormatter(row.net_cost) : "—";
        const avgSalesDisplay =
          row.avg_sales != null
            ? (Math.round(row.avg_sales * 100) / 100).toString()
            : "—";

        return (
          <Box
            key={row.product_id}
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
                  {row.name ? capitalize(row.name) : "—"}
                </Text>
                <Badge colorScheme="purple" fontSize="xs">
                  {row.product_id ?? "—"}
                </Badge>
              </Flex>

              <SimpleGrid columns={2} spacing={2} fontSize="sm">
                <Text color="gray.600">Supplier</Text>
                <Text fontWeight="500">
                  {row.supplier_name ? capitalize(row.supplier_name) : "—"}
                </Text>
                <Text color="gray.600">MRP</Text>
                <Text fontWeight="500">{mrpDisplay}</Text>
                <Text color="gray.600">Net Cost</Text>
                <Text fontWeight="500">{netCostDisplay}</Text>
                <Text color="gray.600">Avg Sales (3mo)</Text>
                <Text fontWeight="500">{avgSalesDisplay}</Text>
              </SimpleGrid>
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
}

export default PurchaseRefMobileCards;
