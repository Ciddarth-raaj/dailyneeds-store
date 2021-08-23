import React from "react";

import styles from "./table.module.css";

import Cell from "./cell.js";

export default class Table extends React.Component {

    render() {
        const { heading, rows } = this.props;

        return (
            <table className={styles.table} style={{ tableLayout: "fixed" }}>
                <thead>{
                    Object.keys(heading).map((key, index) => <Cell
                        key={`heading-${index}`}
                        content={heading[key]}
                        header={true}
                        key={key}
                    />)}</thead>
                <tbody>{
                    rows.map(row => Object.keys(row).map((key, index) => <Cell
                        key={`${key}-${index}`}
                        content={row[key]}
                    />))
                }</tbody>
            </table>
        );
    }
}
