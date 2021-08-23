import * as React from 'react';

import styles from "./table.module.css";

import Icon from "./iconButton.js";

export default function Cell({ content, header, sortCallback, headingKey }) {

  const cellMarkup = header ? (
    <th className={styles.table}>
      {content} <Icon sortCallback={sortCallback} headingKey={headingKey} />
    </th>
  ) : (
    <td className={styles.table}>
      {content}
    </td>
  );

  return (cellMarkup);
}