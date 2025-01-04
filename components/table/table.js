import React from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default class Table extends React.Component {
  render() {
    const { heading, rows, sortCallback, variant = "default" } = this.props;
    const headingKeys = Object.keys(heading);

    return (
      <table
        className={`${styles.table} ${
          variant === "plain" ? styles.plainTable : ""
        }`}
        style={{ tableLayout: "fixed" }}
      >
        <thead>
          <tr>
            {headingKeys.map((key, index) => (
              <Cell
                key={`heading-${index}`}
                content={heading[key]}
                header={true}
                headingKey={key}
                sortCallback={sortCallback}
                variant={variant}
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
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
