import React from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default class Table extends React.Component {
    headingRow = (_cell, cellIndex) => {
        const { heading } = this.props;
        {console.log(`heading-${cellIndex}`)}

        return (
            <Cell
                key={`heading-${cellIndex}`}
                content={heading[cellIndex]}
                header={true}
            />
        );
    };

    renderRow = (_row, rowIndex) => {
        const { rows } = this.props;

        return (
            <tr key={`row=${rowIndex}`}>
                {rows[rowIndex].map((_cell, cellIndex) => {
                    return (
                        <Cell
                            key={`${rowIndex}-${cellIndex}`}
                            content={rows[rowIndex][cellIndex]}
                        />
                    );
                })}
            </tr>
        );
    };

    render() {
        const { heading, rows } = this.props;

        this.headingRow = this.headingRow.bind(this);
        this.renderRow = this.renderRow.bind(this);

        const thead = <tr key="heading">{heading.map(this.headingRow)}</tr>;

        const tbody = rows.map(this.renderRow);

        return (
            <table className={styles.table} style={{ tableLayout: "fixed" }}>
                <thead>{thead}</thead>
                <tbody>{tbody}</tbody>
            </table>
        );
    }
}
