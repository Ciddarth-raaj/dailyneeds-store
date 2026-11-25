import React from "react";
import { Box, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, Table, Tbody, Td, Text, Tfoot, Th, Thead, Tr } from "@chakra-ui/react";
import { formatINR } from "../../util/payrollDashboard";

/** "24 Nov" for a YYYY-MM-DD day. */
export const dayText = (day) => {
  if (!day) return "—";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** "24 Nov" or "1 Nov – 24 Nov". */
export const periodText = (range) => (range.from === range.to ? dayText(range.from) : `${dayText(range.from)} – ${dayText(range.to)}`);

/** ₹value (count), or a dash when there are none. */
export const valueCount = (value, count) =>
  count ? (
    <>
      {formatINR(value)}{" "}
      <Text as="span" color="gray.500">
        ({count})
      </Text>
    </>
  ) : (
    <Text as="span" color="gray.400">
      —
    </Text>
  );

export function SideDrawer({ isOpen, onClose, title, sub, subColor = "gray.600", children }) {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" pr={12}>
          <Text fontSize="md" fontWeight="700">
            {title}
          </Text>
          <Text fontSize="xs" color={subColor} fontWeight="400">
            {sub}
          </Text>
        </DrawerHeader>
        <DrawerBody pb={6}>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export function Heading({ children }) {
  return (
    <Text fontSize="xs" color="gray.600" fontWeight="600" textTransform="uppercase" mt={4} mb={1}>
      {children}
    </Text>
  );
}

/**
 * columns: [{ label, get: (row) => node, numeric, total: node }] - a footer
 * row is drawn when any column has a `total`.
 */
export function SimpleTable({ columns, rows }) {
  const hasTotal = columns.some((c) => c.total !== undefined);
  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.100" borderRadius="md">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>
            {columns.map((c) => (
              <Th key={c.label} isNumeric={c.numeric}>
                {c.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r, i) => (
            <Tr key={r.key || r.day || i}>
              {columns.map((c) => (
                <Td key={c.label} isNumeric={c.numeric} fontWeight={c.bold ? "600" : undefined}>
                  {c.get(r)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
        {hasTotal && rows.length > 1 ? (
          <Tfoot>
            <Tr>
              {columns.map((c, i) => (
                <Th key={c.label} isNumeric={c.numeric}>
                  {i === 0 && c.total === undefined ? "Total" : c.total === undefined ? "" : c.total}
                </Th>
              ))}
            </Tr>
          </Tfoot>
        ) : null}
      </Table>
    </Box>
  );
}

/** One line per debit note / replacement: supplier, location, date, value. */
export function ItemList({ title, rows, empty }) {
  return (
    <>
      <Heading>{title}</Heading>
      {rows.length ? (
        <SimpleTable
          columns={[
            { label: "Supplier", get: (r) => r.supplier },
            { label: "Location", get: (r) => r.location },
            { label: "Date", get: (r) => dayText(r.day), numeric: true },
            { label: "Value", get: (r) => formatINR(r.value), numeric: true },
          ]}
          rows={rows}
        />
      ) : (
        <Text fontSize="sm" color="gray.500">
          {empty}
        </Text>
      )}
    </>
  );
}
