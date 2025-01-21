import React from "react";
import styles from "./table.module.css";

export default class Cell extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortDirection: null,
    };
  }

  handleSort = () => {
    const { header, headingKey, sortCallback } = this.props;
    if (!header || !sortCallback) return;

    let nextDirection;
    if (this.state.sortDirection === null) {
      nextDirection = "asc";
    } else if (this.state.sortDirection === "asc") {
      nextDirection = "desc";
    } else {
      nextDirection = null;
    }

    this.setState({ sortDirection: nextDirection });
    sortCallback(headingKey, nextDirection);
  };

  render() {
    const { content, header, variant, size = "md" } = this.props;
    const { sortDirection } = this.state;

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
