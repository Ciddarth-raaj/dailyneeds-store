import React from "react";

import styles from "./styles.module.css";

function CustomContainer({ title, rightSection, children }) {
  return (
    <div className={styles.mainContainer}>
      <div className={styles.headingContainer}>
        <p className={styles.heading}>{title}</p>
        {rightSection}
      </div>

      <div className={styles.contentContainer}>{children}</div>
    </div>
  );
}

export default CustomContainer;
