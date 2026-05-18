import React from "react";
import { Box, useToken } from "@chakra-ui/react";
import currencyFormatter from "../../util/currencyFormatter";

const COLUMNS = [
  { key: "label", header: "Data Type", align: "left" },
  { key: "docCount", header: "No Of Docs", align: "right", format: "count" },
  {
    key: "taxable",
    header: "Taxable Value",
    align: "right",
    format: "currency",
  },
  { key: "tax", header: "Tax Value", align: "right", format: "currency" },
  { key: "total", header: "Total Value", align: "right", format: "currency" },
];

function formatCell(value, format) {
  if (format === "count") {
    return Number(value ?? 0).toLocaleString("en-IN");
  }
  if (format === "currency") {
    return currencyFormatter(Number(value ?? 0));
  }
  return value ?? "—";
}

/**
 * Period summary: GSTR-2A vs Purchase Document totals.
 */
export default function Gstr2aPrSummaryTable({
  summary2A,
  summaryPD,
  colorScheme = "blue",
}) {
  const a = summary2A ?? {};
  const p = summaryPD ?? {};

  const rows = [
    { label: "Purchase Document", ...p },
    { label: "GSTR-2A", ...a },
    {
      label: "Difference",
      docCount: Number(p.docCount ?? 0) - Number(a.docCount ?? 0),
      taxable: Number(p.taxable ?? 0) - Number(a.taxable ?? 0),
      tax: Number(p.tax ?? 0) - Number(a.tax ?? 0),
      total: Number(p.total ?? 0) - Number(a.total ?? 0),
      isDifference: true,
    },
  ];

  const [headerBg, headerColor, borderColor] = useToken("colors", [
    `${colorScheme}.50`,
    `${colorScheme}.800`,
    `${colorScheme}.100`,
  ]);

  return (
    <Box
      overflowX="auto"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      bg="white"
      mb={4}
    >
      <Box
        as="table"
        w="full"
        fontSize="xs"
        sx={{
          borderCollapse: "collapse",
          "th, td": {
            px: 3,
            py: 1.5,
            borderBottom: `1px solid ${borderColor}`,
          },
          "tbody tr:last-child td": { borderBottom: "none" },
          "tbody tr:hover td": { bg: "gray.50" },
        }}
      >
        <Box as="thead" bg={headerBg}>
          <Box as="tr">
            {COLUMNS.map((col) => (
              <Box
                as="th"
                key={col.key}
                textAlign={col.align}
                fontWeight="medium"
                color={headerColor}
                fontSize="xs"
                whiteSpace="nowrap"
              >
                {col.header}
              </Box>
            ))}
          </Box>
        </Box>
        <Box as="tbody">
          {rows.map((row) => (
            <Box as="tr" key={row.label}>
              {COLUMNS.map((col) => (
                <Box
                  as="td"
                  key={col.key}
                  textAlign={col.align}
                  fontWeight={
                    col.key === "label" || row.isDifference
                      ? "semibold"
                      : "normal"
                  }
                  color={col.key === "label" ? "gray.700" : "gray.800"}
                  fontVariantNumeric={
                    col.format === "currency" ? "tabular-nums" : undefined
                  }
                >
                  {formatCell(row[col.key], col.format)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
