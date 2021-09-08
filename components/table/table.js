import React from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default class Table extends React.Component {

    render() {
        const { heading, rows, sortCallback } = this.props;

        return (
            <table className={styles.table} style={{ tableLayout: "fixed" }}>
                <thead>{
                    Object.keys(heading).map((key, index) => <Cell
                        key={`heading-${index}`}
                        content={heading[key]}
                        header={true}
                        headingKey={key}
                        sortCallback={sortCallback}
                    />)}</thead>
                <tbody>{
                    rows.map(row => 
                        <tr>
                        {Object.keys(row).map((key, index) => <Cell
                        key={`${key}-${index}`}
                        content={row[key]}
                    />)}</tr>)
                }</tbody>
            </table>
        );
    }
}
