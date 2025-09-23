import React from "react";
import styles from "./table.module.css";
import { theme } from "@chakra-ui/react";

export default class Cell extends React.Component {
  handleSort = (e) => {
    const { header, headingKey, sortCallback } = this.props;
    if (!header || !sortCallback) return;
    sortCallback(headingKey);
  };

  render() {
    const {
      content,
      header,
      variant,
      size = "md",
      headingKey,
      sortState = [],
    } = this.props;
    const sortEntry = Array.isArray(sortState)
      ? sortState.find((s) => s.key === headingKey)
      : null;
    const sortDirection = sortEntry ? sortEntry.direction : "null";

    if (header) {
      const Icon = () => {
        if (sortDirection === "asc") {
          return (
            <svg
              width="12"
              height="12"
              viewBox="0 0 320 512"
              aria-hidden="true"
            >
              <path
                fill={theme.colors.purple[500]}
                d="M279 224H41c-21.4 0-32.1-25.9-17-41l119-120c9.4-9.4 24.6-9.4 33.9 0l119 120c15.1 15.1 4.4 41-17 41z"
              />
            </svg>
          );
        }
        if (sortDirection === "desc") {
          return (
            <svg
              width="12"
              height="12"
              viewBox="0 0 320 512"
              aria-hidden="true"
            >
              <path
                fill={theme.colors.purple[500]}
                d="M41 288h238c21.4 0 32.1 25.9 17 41L177 449c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z"
              />
            </svg>
          );
        }
        // neutral: FA sort icon (both arrows)
        return (
          <svg width="12" height="12" viewBox="0 0 320 512" aria-hidden="true">
            <path
              fill={theme.colors.gray[300]}
              d="M279 224H41c-21.4 0-32.1-25.9-17-41l119-120c9.4-9.4 24.6-9.4 33.9 0l119 120c15.1 15.1 4.4 41-17 41zM41 288h238c21.4 0 32.1 25.9 17 41L177 449c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z"
            />
          </svg>
        );
      };
      return (
        <th
          onClick={this.handleSort}
          // using explicit icons instead of CSS :after
          className={`${styles.headerCell} ${
            variant === "plain" ? styles.plainHeader : ""
          } ${styles[size]}`}
        >
          <div>
            <span>{content}</span>
            <span className={styles.sortIcon} aria-hidden="true">
              <Icon />
            </span>
          </div>
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
