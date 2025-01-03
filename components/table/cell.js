import React from "react";
import styles from "./table.module.css";

export default class Cell extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortDirection: null, // null, 'asc', or 'desc'
    };
  }

  handleSort = () => {
    const { header, headingKey, sortCallback } = this.props;
    if (!header || !sortCallback) return;

    let nextDirection;
    // Cycle through: null -> asc -> desc -> null
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
    const { content, header } = this.props;
    const { sortDirection } = this.state;

    if (header) {
      return (
        <th
          onClick={this.handleSort}
          data-sort={sortDirection}
          className={styles.headerCell}
        >
          <div>{content}</div>
        </th>
      );
    }

    return <td>{content}</td>;
  }
}
