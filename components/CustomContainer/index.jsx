import React, { useState } from "react";
import { IconButton } from "@chakra-ui/react";

import styles from "./styles.module.css";

function CustomContainer({
  title,
  rightSection,
  children,
  filledHeader,
  smallHeader = false,
  subtleHeader = false,
  style,
  noPadding,
  toggleChildren,
  defaultOpen = true,
  onToggle,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (onToggle) onToggle(next);
  };

  const getHeaderStyle = () => {
    if (subtleHeader) {
      return styles.subtleHeader;
    } else if (filledHeader) {
      return styles.filledHeader;
    }

    return "";
  };

  return (
    <div className={styles.mainContainer} style={style}>
      {title && (
        <div className={`${styles.headingContainer} ${getHeaderStyle()}`}>
          <p
            className={`${styles.heading} ${
              smallHeader ? styles.smallHeading : ""
            }`}
          >
            {title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {rightSection}

            {toggleChildren && (
              <IconButton
                onClick={handleToggle}
                aria-label="Toggle section visibility"
                size="sm"
                variant="ghost"
                colorScheme="purple"
                icon={
                  <i
                    className={`fa ${
                      isOpen ? "fa-chevron-up" : "fa-chevron-down"
                    }`}
                  />
                }
                title={isOpen ? "Hide" : "Show"}
              />
            )}
          </div>
        </div>
      )}

      {(!toggleChildren || isOpen) && (
        <div
          className={`${styles.contentContainer} ${
            noPadding ? styles.noPadding : ""
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default CustomContainer;
