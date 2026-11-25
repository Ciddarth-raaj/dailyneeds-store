import React from "react";
import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { GAP_REASONS, tone } from "../../../util/attendanceDashboard";

const REASON = GAP_REASONS.reduce((acc, r) => {
  acc[r.key] = r;
  return acc;
}, {});

/**
 * Why each schedule is not covered, with elapsed time for follow-up.
 *
 * The elapsed minutes are for ordering and for knowing how long to wait before
 * calling somebody — they are not a lateness penalty, a break limit or a
 * misconduct record, and no such thing exists in this system. An OUT is
 * reported as an OUT; it is not described as lunch or an early departure,
 * because this data cannot tell those apart.
 */
export default function GapDetailPanel({ rows, total, truncated, onOpenAll, onOpenEmployee }) {
  const data = Array.isArray(rows) ? rows : [];
  const count = total === undefined || total === null ? data.length : total;

  return (
    <CustomContainer title="Gaps to check" filledHeader size="xs">
      {data.length === 0 ? (
        <Flex minH="120px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Every scheduled employee is recorded IN at their expected location.
          </Text>
        </Flex>
      ) : (
        <Box>
          <Box maxH="300px" overflowY="auto">
          {data.map((row) => {
            const reason = REASON[row.gap_class] || { label: row.gap_label, color: "gray" };
            return (
              <Flex
                key={`${row.employee_id}-${row.attendance_date}`}
                align="flex-start"
                justify="space-between"
                gap={2}
                py={2}
                borderBottomWidth="1px"
                borderColor="gray.100"
                _hover={{ bg: "gray.50", cursor: "pointer" }}
                onClick={() => onOpenEmployee(row)}
              >
                <Box minW={0}>
                  <Text fontSize="xs" fontWeight="600" color="gray.800" noOfLines={1}>
                    {row.employee_name}
                  </Text>
                  <Text fontSize="10px" color="gray.600" noOfLines={2} lineHeight="1.3">
                    {row.designation_name} · {row.outlet_name}
                  </Text>
                  <Text fontSize="10px" color="gray.500" noOfLines={1}>
                    {row.shift_code || "—"} {row.scheduled_start}–{row.scheduled_end}
                  </Text>
                  <Text fontSize="10px" color="gray.700" mt="2px" noOfLines={2}>
                    {row.explanation}
                  </Text>
                </Box>
                <Badge
                  flexShrink={0}
                  fontSize="9px"
                  bg={tone(reason.color).bg}
                  color={tone(reason.color).fg}
                  borderWidth="1px"
                  borderColor={tone(reason.color).border}
                >
                  {reason.label}
                </Badge>
              </Flex>
            );
          })}
          </Box>
          {/* OUTSIDE the scroll box: a caption clipped by its own container is
              a caption nobody reads, and this one carries the disclaimer. */}
          {truncated ? (
            <Flex align="center" justify="space-between" gap={2} mt={2} wrap="wrap">
              <Text fontSize="10px" color="gray.500">
                Showing {data.length} of {count}. This is a preview, not the whole list.
              </Text>
              <Button size="xs" variant="outline" onClick={onOpenAll}>
                See all {count}
              </Button>
            </Flex>
          ) : null}
          <Text fontSize="10px" color="gray.500" mt={2}>
            Elapsed times are for follow-up order only — they are not lateness penalties. A
            recorded OUT is exactly that: it is not described as lunch, an early departure or
            anything else this data cannot establish. “Location not verified” is a question about
            the punch record, never about the employee.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
