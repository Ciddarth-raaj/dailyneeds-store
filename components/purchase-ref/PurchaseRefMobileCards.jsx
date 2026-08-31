import React from "react";
import {
  Box,
  Text,
  Flex,
  Badge,
  VStack,
  SimpleGrid,
  Button,
} from "@chakra-ui/react";
import { capitalize } from "../../util/string";
import currencyFormatter from "../../util/currencyFormatter";
import ProductImageZoom from "./ProductImageZoom";

/**
 * Cards rendered before "Show more" is pressed, and how many each press adds.
 *
 * Purchase Ref holds ~14k products, and a card is ~18 DOM nodes — rendering
 * them all put a quarter of a million nodes on the page, which took ~38s to
 * mount and made every search keystroke crawl. The desktop grid paginates at
 * 20; this is the mobile equivalent.
 */
const PAGE_SIZE = 25;

function PurchaseRefCard({ row }) {
  const mrpDisplay = row.mrp != null ? currencyFormatter(row.mrp) : "—";
  const netCostDisplay =
    row.net_cost != null ? currencyFormatter(row.net_cost) : "—";
  const currentStockDisplay =
    row.current_stock != null
      ? (Math.round(row.current_stock * 100) / 100).toString()
      : "—";
  const avgSalesDisplay =
    row.avg_sales != null ? Math.round(row.avg_sales).toString() : "—";

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      p={4}
      bg="white"
      shadow="sm"
    >
      <VStack align="stretch" spacing={3}>
        <Flex align="center" gap={3}>
          <ProductImageZoom src={row.image_url} thumbSize="48px" />
          <Flex
            flex={1}
            justify="space-between"
            align="center"
            wrap="wrap"
            gap={2}
          >
            <Text fontWeight="600" fontSize="md" color="purple.700">
              {row.name ? capitalize(row.name) : "—"}
            </Text>
            <Badge colorScheme="purple" fontSize="xs">
              {row.product_id ?? "—"}
            </Badge>
          </Flex>
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
          <Text color="gray.600">Current Stock</Text>
          <Text fontWeight="500">{currentStockDisplay}</Text>
          <Text color="gray.600">Avg Sales (3mo)</Text>
          <Text fontWeight="500">{avgSalesDisplay}</Text>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

const MemoPurchaseRefCard = React.memo(PurchaseRefCard);

/**
 * Mobile card list for the Purchase Ref page. Renders PAGE_SIZE cards at a
 * time; "Show more" reveals the next batch.
 * @param {Object} props
 * @param {Array} props.rows - product_id, name, supplier_name, mrp, net_cost, current_stock, avg_sales
 */
function PurchaseRefMobileCards({ rows = [] }) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  // A new search resets the list back to the first batch.
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [rows]);

  if (rows.length === 0) {
    return null;
  }

  const visibleRows = rows.slice(0, visibleCount);
  const remaining = rows.length - visibleRows.length;

  return (
    <VStack align="stretch" spacing={3}>
      {visibleRows.map((row) => (
        <MemoPurchaseRefCard key={row.product_id} row={row} />
      ))}

      {remaining > 0 && (
        <VStack spacing={2} pt={1}>
          <Text fontSize="xs" color="gray.600">
            Showing {visibleRows.length.toLocaleString("en-IN")} of{" "}
            {rows.length.toLocaleString("en-IN")}
          </Text>
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            width="100%"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Show more
          </Button>
        </VStack>
      )}
    </VStack>
  );
}

export default React.memo(PurchaseRefMobileCards);
