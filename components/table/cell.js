import React from "react";
import styles from "./table.module.css";

export default class Cell extends React.Component {
  handleSort = () => {
    const { header, headingKey, sortCallback, currentSort } = this.props;
    if (!header || !sortCallback) return;

    let nextDirection;
    if (currentSort.key !== headingKey || currentSort.direction === null) {
      // Start with ascending if it's a new column OR the current column was disabled
      nextDirection = "asc";
    } else if (currentSort.direction === "asc") {
      nextDirection = "desc";
    } else {
      nextDirection = null;
    }

    sortCallback(headingKey, nextDirection);
  };

  render() {
    const {
      content,
      header,
      variant,
      size = "md",
      headingKey,
      currentSort,
    } = this.props;
    const showSortIcon = header && currentSort.key === headingKey;
    const sortDirection = showSortIcon ? currentSort.direction : null;

    if (header) {
      return (
        <th
          onClick={this.handleSort}
          data-sort={sortDirection}
          className={`${styles.headerCell} ${
            variant === "plain" ? styles.plainHeader : ""
          } ${styles[size]}`}
        >
          <div>{content}</div>
        </th>
      );
    }

    return (
      <td
        className={`${variant === "plain" ? styles.plainCell : ""} ${
          styles[size]
        }`}
      >
        {content}
      </td>
    );
  }
}
