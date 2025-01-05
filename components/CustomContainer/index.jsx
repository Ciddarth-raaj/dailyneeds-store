import React from "react";

import styles from "./styles.module.css";

function CustomContainer({ title, rightSection, children, filledHeader }) {
  return (
    <div className={styles.mainContainer}>
      <div
        className={`${styles.headingContainer} ${
          filledHeader ? styles.filledHeader : ""
        }`}
      >
        <p className={styles.heading}>{title}</p>
        {rightSection}
      </div>

      <div className={styles.contentContainer}>{children}</div>
    </div>
  );
}

export default CustomContainer;
