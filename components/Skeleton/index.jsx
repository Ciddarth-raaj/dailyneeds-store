import React from "react";
import { Skeleton as ChakraSkeleton, Stack } from "@chakra-ui/react";

export const TableRowSkeleton = ({ columns }) => {
  return (
    <tr>
      {Array(columns)
        .fill(0)
        .map((_, index) => (
          <td key={index} style={{ padding: "12px" }}>
            <ChakraSkeleton height="20px" />
          </td>
        ))}
    </tr>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <table style={{ width: "100%" }}>
      <tbody>
        {Array(rows)
          .fill(0)
          .map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
      </tbody>
    </table>
  );
};

const Skeleton = ({
  width = "100%",
  height = "20px",
  borderRadius = "4px",
  margin = "0",
}) => {
  return (
    <ChakraSkeleton
      startColor="purple.100"
      endColor="purple.300"
      style={{
        width,
        height,
        borderRadius,
        margin,
      }}
    />
  );
};

export default Skeleton;
