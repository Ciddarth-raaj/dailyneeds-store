import React from "react";

import styles from "./styles.module.css";

function CustomContainer({
  title,
  rightSection,
  children,
  filledHeader,
  smallHeader,
  style,
}) {
  return (
    <div className={styles.mainContainer} style={style}>
      <div
        className={`${styles.headingContainer} ${
          filledHeader ? styles.filledHeader : ""
        }`}
      >
        <p
          className={`${styles.heading} ${
            smallHeader ? styles.smallHeading : ""
          }`}
        >
          {title}
        </p>
        {rightSection}
      </div>

      <div className={styles.contentContainer}>{children}</div>
    </div>
  );
}

export default CustomContainer;
