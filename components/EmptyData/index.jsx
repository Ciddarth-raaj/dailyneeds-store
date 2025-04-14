import React from "react";
import { Box, Text } from "@chakra-ui/react";
import styles from "./styles.module.css";

const EmptyData = ({
  message = "No data found",
  size = "lg", // sm, md, lg
  button = null,
}) => {
  const containerSizes = {
    sm: { height: "100px", iconSize: "30px" },
    md: { height: "150px", iconSize: "40px" },
    lg: { height: "200px", iconSize: "50px" },
  };

  return (
    <Box
      className={styles.container}
      height={containerSizes[size].height}
      data-testid="empty-data"
    >
      <div className={styles.content}>
        <div
          className={styles.icon}
          style={{
            fontSize: containerSizes[size].iconSize,
            color: "var(--chakra-colors-purple-100)",
          }}
        >
          <i className="fa fa-box-open" />
        </div>
        <Text
          color="gray.500"
          fontSize={size === "sm" ? "sm" : "md"}
          mt={4}
          textAlign="center"
        >
          {message}
        </Text>

        {button && button}
      </div>
    </Box>
  );
};

export default EmptyData;
