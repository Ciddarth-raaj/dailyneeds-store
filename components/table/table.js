import React, { useState, useEffect } from "react";
import { Flex, Button, Text, Select } from "@chakra-ui/react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default function Table({
  heading,
  rows = [],
  sortCallback,
  variant = "default",
  size = "md",
  showPagination = false,
  renderedRows = null,
  dontAffectPagination = false,
  defaultRowsPerPage = 50,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Reset pagination when rows change
  useEffect(() => {
    if (!dontAffectPagination) {
      setCurrentPage(1);
    }
  }, [rows, dontAffectPagination]);

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = showPagination ? rows.slice(startIndex, endIndex) : rows;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const [currentSort, setCurrentSort] = useState({
    key: null,
    direction: null,
  });

  const handleSort = (key, direction) => {
    setCurrentSort({ key, direction });
    sortCallback(key, direction);
  };

  const headingKeys = heading ? Object.keys(heading) : [];

  return (
    <div className={styles.tableWrapper}>
      {showPagination && (
        <Flex align="center" gap={2} justify="flex-end" mb="22px">
          <Text fontSize="12px">Rows per page:</Text>
          <Select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            size="xs"
            width="70px"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Select>
        </Flex>
      )}

      <table
        className={`${styles.table} ${
          variant === "plain" ? styles.plainTable : ""
        } ${styles[size]}`}
      >
        <thead>
          <tr>
            {headingKeys.map((key, index) => (
              <Cell
                key={`heading-${key}-${index}`}
                content={heading[key]}
                header={true}
                headingKey={key}
                sortCallback={handleSort}
                variant={variant}
                size={size}
                currentSort={currentSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {renderedRows
            ? renderedRows
            : currentRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headingKeys.map((key, cellIndex) => (
                    <Cell
                      key={`${key}-${cellIndex}`}
                      content={row[key]}
                      variant={variant}
                      size={size}
                    />
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {showPagination && (
        <Flex
          justify="space-between"
          align="center"
          className={styles.paginationContainer}
        >
          <Text fontSize="12px" flex={1} textAlign="center" ml="250px">
            {startIndex + 1}-{Math.min(endIndex, rows.length)} of {rows.length}
          </Text>

          <Flex gap={2}>
            <Button
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              variant="ghost"
            >
              First
            </Button>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="ghost"
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="ghost"
            >
              Next
            </Button>
            <Button
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              variant="ghost"
            >
              Last
            </Button>
          </Flex>
        </Flex>
      )}
    </div>
  );
}
