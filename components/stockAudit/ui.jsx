import React, { useState } from "react";
import {
  Badge, Box, Button, Collapse, Flex, Heading, HStack, IconButton, Input, Select, SimpleGrid, Stack, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useBreakpointValue,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { STATUS, REASON_LABEL, known } from "./data/calc";

export const BRAND = { purple: "#732F8D", orange: "#F15A22", purpleSoft: "#F4ECF7", orangeSoft: "#FEEFE8" };

// ------------------------------------------------------------------ formatting
const nf = new Intl.NumberFormat("en-IN");
export const fmtNum = (n) => (n == null ? "—" : nf.format(Math.round(n)));
export const fmtMoney = (n) => (n == null ? "—" : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n)}`);
/** Percentages are shown truncated (never rounded UP into a better slab). */
export const fmtPct = (n) => (n == null ? "—" : `${(Math.floor(n * 100) / 100).toFixed(2)}%`);
export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

const STATUS_STYLE = {
  [STATUS.PENDING]: { colorScheme: "orange", label: "Pending" },
  [STATUS.UNAVAILABLE]: { colorScheme: "gray", label: "Unavailable" },
  [STATUS.NOT_APPLICABLE]: { colorScheme: "gray", label: "Not applicable", variant: "outline" },
};

/** Renders a status cell. Never prints a number for Pending / Unavailable / N.A. */
export function Cell({ c, kind = "num", size = "sm", showReason = false }) {
  if (c == null) return <Text as="span">—</Text>;
  if (typeof c !== "object") return <Text as="span" fontWeight={600}>{kind === "money" ? fmtMoney(c) : kind === "pct" ? fmtPct(c) : kind === "raw" || typeof c === "string" ? c : fmtNum(c)}</Text>;
  if (known(c)) {
    const v = kind === "money" ? fmtMoney(c.value) : kind === "pct" ? fmtPct(c.value) : kind === "raw" ? String(c.value) : fmtNum(c.value);
    return (
      <Text as="span" fontWeight={600}>
        {v}
        {c.provisional ? (
          <Badge ml={1} colorScheme="purple" variant="subtle" fontSize="0.6em">provisional</Badge>
        ) : null}
      </Text>
    );
  }
  const st = STATUS_STYLE[c.status] || STATUS_STYLE[STATUS.PENDING];
  const why = REASON_LABEL[c.reason] || c.reason;
  return (
    <Tooltip label={why} hasArrow>
      <Box as="span" display="inline-flex" flexDirection="column" alignItems="flex-start">
        <Badge colorScheme={st.colorScheme} variant={st.variant || "subtle"} fontSize={size === "sm" ? "0.65em" : "0.75em"} textTransform="none">{st.label}</Badge>
        {showReason && why ? <Text as="span" fontSize="10px" color="gray.500" mt="1px">{why}</Text> : null}
      </Box>
    </Tooltip>
  );
}

export function SampleBanner({ note }) {
  return (
    <Flex bg={BRAND.orangeSoft} border="1px solid" borderColor="orange.200" borderRadius="md" px={3} py={2} mb={3} align="center" gap={2} wrap="wrap">
      <Badge bg={BRAND.orange} color="white">SAMPLE DATA</Badge>
      <Text fontSize="xs" color="gray.700" flex="1" minW="200px">
        {note || "Preview with realistic sample data. Not RetailPilot data, not an Excel import. Nothing on this screen is saved, approved or paid."}
      </Text>
    </Flex>
  );
}

export function Section({ title, subtitle, actions, children, ...rest }) {
  return (
    <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.100" boxShadow="sm" p={{ base: 3, md: 4 }} mb={4} {...rest}>
      {(title || actions) && (
        <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" mb={3} gap={2} direction={{ base: "column", md: "row" }}>
          <Box>
            {title ? <Heading size="sm" color={BRAND.purple}>{title}</Heading> : null}
            {subtitle ? <Text fontSize="xs" color="gray.500" mt={0.5}>{subtitle}</Text> : null}
          </Box>
          {actions ? <HStack spacing={2} flexWrap="wrap">{actions}</HStack> : null}
        </Flex>
      )}
      {children}
    </Box>
  );
}

export function StatCard({ label, sub, c, kind = "num", accent = BRAND.purple, onClick, tamil }) {
  return (
    <Box
      bg="white" borderRadius="lg" border="1px solid" borderColor="gray.100" p={3} boxShadow="sm" borderTop="3px solid" borderTopColor={accent}
      cursor={onClick ? "pointer" : "default"} onClick={onClick} _hover={onClick ? { boxShadow: "md" } : undefined} minW={0}
    >
      <Text fontSize="11px" color="gray.500" textTransform="uppercase" letterSpacing="0.03em" noOfLines={2}>{label}</Text>
      {tamil ? <Text fontSize="10px" color="gray.400">{tamil}</Text> : null}
      <Box fontSize={{ base: "lg", md: "xl" }} mt={1} color="gray.800"><Cell c={c} kind={kind} size="md" showReason /></Box>
      {sub ? <Text fontSize="11px" color="gray.500" mt={1}>{sub}</Text> : null}
    </Box>
  );
}

export const StatGrid = ({ children, cols = { base: 2, md: 3, lg: 4 } }) => <SimpleGrid columns={cols} spacing={3} mb={4}>{children}</SimpleGrid>;

export function Progress({ c, color = BRAND.purple, height = "8px", label }) {
  const v = known(c) ? Math.max(0, Math.min(100, c.value)) : null;
  return (
    <Box>
      {label ? (
        <Flex justify="space-between" fontSize="11px" color="gray.600" mb={1}><Text>{label}</Text><Cell c={c} kind="pct" /></Flex>
      ) : null}
      <Box bg="gray.100" borderRadius="full" h={height} overflow="hidden" title={v == null ? "Not available" : `${v.toFixed(1)}%`}>
        {v == null ? (
          <Box h="100%" w="100%" bgImage="repeating-linear-gradient(45deg, #e2e8f0 0 6px, #f7fafc 6px 12px)" />
        ) : (
          <Box h="100%" w={`${v}%`} bg={color} borderRadius="full" />
        )}
      </Box>
    </Box>
  );
}

/** Table on desktop, expandable cards on mobile. Paging is server-side (the adapter pages). */
export function DataList({ columns, rows, keyOf = (r, i) => i, onRowClick, renderDetail, page, pages, total, onPage, empty = "Nothing to show", dense }) {
  const mobile = useBreakpointValue({ base: true, md: false });
  const [open, setOpen] = useState(null);
  if (!rows || !rows.length) return <Box p={6} textAlign="center" color="gray.500" fontSize="sm" border="1px dashed" borderColor="gray.200" borderRadius="md">{empty}</Box>;
  const primary = columns.filter((c) => c.primary);
  const rest = columns.filter((c) => !c.primary);
  return (
    <Box>
      {mobile ? (
        <Stack spacing={2}>
          {rows.map((r, i) => {
            const k = keyOf(r, i);
            const isOpen = open === k;
            return (
              <Box key={k} border="1px solid" borderColor="gray.100" borderRadius="md" bg="white" p={3}>
                <Flex justify="space-between" align="flex-start" gap={2} onClick={() => (onRowClick ? onRowClick(r) : setOpen(isOpen ? null : k))} cursor="pointer">
                  <Box minW={0} flex="1">
                    {primary.map((c) => <Box key={c.key} fontSize="sm" fontWeight={c === primary[0] ? 600 : 400} noOfLines={2}>{c.render ? c.render(r) : r[c.key]}</Box>)}
                  </Box>
                  <Box textAlign="right">{rest.filter((c) => c.mobileRight).map((c) => <Box key={c.key} fontSize="sm">{c.render ? c.render(r) : r[c.key]}</Box>)}</Box>
                </Flex>
                <Button size="xs" variant="link" color={BRAND.purple} mt={1} onClick={() => setOpen(isOpen ? null : k)}>{isOpen ? "Hide details" : "Details"}</Button>
                <Collapse in={isOpen} animateOpacity>
                  <SimpleGrid columns={2} spacingX={3} spacingY={2} mt={2}>
                    {rest.filter((c) => !c.mobileRight).map((c) => (
                      <Box key={c.key} minW={0}>
                        <Text fontSize="10px" color="gray.500" textTransform="uppercase">{c.label}</Text>
                        <Box fontSize="sm">{c.render ? c.render(r) : r[c.key] ?? "—"}</Box>
                      </Box>
                    ))}
                  </SimpleGrid>
                  {renderDetail ? <Box mt={2}>{renderDetail(r)}</Box> : null}
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Box overflowX="auto" border="1px solid" borderColor="gray.100" borderRadius="md">
          <Table size={dense ? "sm" : "sm"} variant="simple">
            <Thead bg={BRAND.purpleSoft}>
              <Tr>{columns.map((c) => <Th key={c.key} fontSize="10px" color={BRAND.purple} isNumeric={c.numeric} whiteSpace="nowrap">{c.label}</Th>)}</Tr>
            </Thead>
            <Tbody>
              {rows.map((r, i) => (
                <React.Fragment key={keyOf(r, i)}>
                  <Tr _hover={{ bg: "gray.50" }} cursor={onRowClick || renderDetail ? "pointer" : "default"} onClick={() => (onRowClick ? onRowClick(r) : renderDetail ? setOpen(open === keyOf(r, i) ? null : keyOf(r, i)) : null)}>
                    {columns.map((c) => <Td key={c.key} isNumeric={c.numeric} fontSize="sm" py={2}>{c.render ? c.render(r) : r[c.key] ?? "—"}</Td>)}
                  </Tr>
                  {renderDetail && open === keyOf(r, i) ? (
                    <Tr><Td colSpan={columns.length} bg="gray.50">{renderDetail(r)}</Td></Tr>
                  ) : null}
                </React.Fragment>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
      {pages > 1 ? (
        <Flex justify="space-between" align="center" mt={3} fontSize="xs" color="gray.600" gap={2}>
          <Text>{fmtNum(total)} rows · page {page} of {fmtNum(pages)}</Text>
          <HStack>
            <Button size="sm" minH="36px" onClick={() => onPage(page - 1)} isDisabled={page <= 1}>Previous</Button>
            <Button size="sm" minH="36px" onClick={() => onPage(page + 1)} isDisabled={page >= pages}>Next</Button>
          </HStack>
        </Flex>
      ) : null}
    </Box>
  );
}

export function FilterBar({ children }) {
  const mobile = useBreakpointValue({ base: true, md: false });
  const [open, setOpen] = useState(false);
  if (!mobile) return <Flex gap={2} wrap="wrap" mb={3} align="flex-end">{children}</Flex>;
  return (
    <Box mb={3}>
      <Button size="sm" w="100%" minH="40px" variant="outline" colorScheme="purple" onClick={() => setOpen(!open)}>{open ? "Hide filters" : "Filters"}</Button>
      <Collapse in={open}><Stack mt={2} spacing={2}>{children}</Stack></Collapse>
    </Box>
  );
}

export function SelectField({ label, value, onChange, options, minW = "160px" }) {
  return (
    <Box minW={minW}>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" mb={0.5}>{label}</Text>
      <Select size="sm" h="38px" value={value ?? ""} onChange={(e) => onChange(e.target.value)} bg="white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Box>
  );
}

export function SearchField({ value, onChange, placeholder = "Search" }) {
  return (
    <Box minW="200px" flex="1">
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" mb={0.5}>Search</Text>
      <Input size="sm" h="38px" bg="white" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Box>
  );
}

/** Every action in the preview: explains that nothing happens. */
export function PreviewButton({ children, label, ...rest }) {
  return (
    <Button size="sm" minH="38px" onClick={() => toast(`${label || "Action"}: preview only. Nothing is saved, approved, imported or paid.`, { icon: "👁" })} {...rest}>
      {children}
    </Button>
  );
}

export function Pill({ children, color = "purple" }) {
  return <Badge colorScheme={color} variant="subtle" textTransform="none" fontSize="0.7em" px={2} borderRadius="full">{children}</Badge>;
}

export function RankMove({ rank, previous }) {
  if (previous == null) return <Text as="span" color="gray.400" fontSize="xs">new</Text>;
  const d = previous - rank;
  if (d > 0) return <Text as="span" color="green.500" fontWeight={700} fontSize="sm">▲ {d}</Text>;
  if (d < 0) return <Text as="span" color="red.500" fontWeight={700} fontSize="sm">▼ {-d}</Text>;
  return <Text as="span" color="gray.400" fontSize="sm">●</Text>;
}

export const KV = ({ k, v }) => (
  <Flex justify="space-between" py={1} borderBottom="1px solid" borderColor="gray.50" fontSize="sm" gap={3}>
    <Text color="gray.600">{k}</Text>
    <Box textAlign="right">{v}</Box>
  </Flex>
);

export { IconButton };
