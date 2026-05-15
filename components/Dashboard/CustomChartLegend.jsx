"use client";

import React from "react";
import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";

const SWATCH_SIZE = "10px";

/**
 * Reusable chart legend. Use below a chart or anywhere you need a consistent legend.
 *
 * @param {Object} props
 * @param {Array<{ name: string, value?: string|number, fill: string }>} props.items - Legend entries
 * @param {number} [props.columns=2] - Grid columns
 * @param {boolean} [props.showDivider=true] - Show the brand100 divider line above legend
 * @param {boolean} [props.truncateLabelOnly=false] - Ellipsis on name only; value stays visible
 */
function DashboardChartLegend({
  items = [],
  columns = 2,
  showDivider = true,
  truncateLabelOnly = false,
}) {
  if (!items?.length) return null;

  return (
    <>
      {showDivider && (
        <Box
          w="calc(100% + 32px)"
          h="1px"
          bgColor="purple.100"
          ml="-16px"
          mt="22px"
          mb="8px"
        />
      )}
      <Grid
        templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
        gap="6px"
        mt={showDivider ? "12px" : 2}
      >
        {items.map((item, idx) => (
          <GridItem key={idx} minW={0}>
            <Flex align="center" fontSize="xs" h="24px" minW={0}>
              <Box
                w={SWATCH_SIZE}
                h={SWATCH_SIZE}
                minW={SWATCH_SIZE}
                minH={SWATCH_SIZE}
                flexShrink={0}
                borderRadius="2px"
                bg={item.fill}
                mr={2}
              />
              {truncateLabelOnly ? (
                <Text
                  title={
                    item.value != null
                      ? `${item.name} (${item.value})`
                      : String(item.name)
                  }
                  whiteSpace="nowrap"
                  display="flex"
                  alignItems="center"
                  minW={0}
                  w="100%"
                  lineHeight="1.2"
                >
                  <Box
                    as="span"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    minW={0}
                    flex="1"
                  >
                    {item.name}
                  </Box>
                  {item.value != null ? (
                    <Box as="span" flexShrink={0} ml={1}>
                      {`(${item.value})`}
                    </Box>
                  ) : null}
                </Text>
              ) : (
                <Text
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  title={
                    item.value != null
                      ? `${item.name} (${item.value})`
                      : String(item.name)
                  }
                >
                  {item.name}
                  {item.value != null ? ` (${item.value})` : ""}
                </Text>
              )}
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </>
  );
}

export default DashboardChartLegend;
