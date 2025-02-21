import React, { useState } from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default function Table({
  heading,
  rows = [],
  sortCallback,
  variant = "default",
  size = "md",
}) {
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
          {rows.map((row, rowIndex) => (
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
    </div>
  );
}
