import * as React from 'react';
import styles from "./table.module.css";
import Icon from "../IconButton/iconButton.js";

export default function Cell({
  content,
  header,
}) {

  const cellMarkup = header ? (
    <th className={styles.table}>
      {content} <Icon />
    </th>
  ) : (
    <td className={styles.table}>
      {content}
    </td>
  );

  return (cellMarkup);
}