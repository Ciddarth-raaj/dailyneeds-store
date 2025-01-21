import React from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default class Table extends React.Component {
  render() {
    const {
      heading,
      rows = [],
      sortCallback,
      variant = "default",
      size = "md",
    } = this.props;
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
                  sortCallback={sortCallback}
                  variant={variant}
                  size={size}
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
}
