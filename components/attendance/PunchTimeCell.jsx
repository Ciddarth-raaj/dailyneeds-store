import React from "react";
import {
  Box,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Text,
} from "@chakra-ui/react";
import { displayDate } from "../../util/attendanceRaw";

/**
 * One Clock Time cell: the time, and under it the punch location.
 *
 * NEUTRAL BY DESIGN. Cross-outlet punching is normal business - warehouse
 * staff helping a store, HR touring, a manager visiting - so the location
 * line is rendered in the same muted style for every punch. Nothing here is
 * coloured, weighted or iconed by whether the punch location matches the
 * employee's home outlet. The popover carries the audit detail: device
 * label, Cloud ID, source IP, the raw timestamp, and the calendar date when
 * it differs from the attendance date (an after-midnight punch).
 */
export default function PunchTimeCell({ punch, attendanceDate }) {
  if (!punch) return null;
  const location = punch.punch_outlet_code || punch.punch_outlet || "";
  const crossedMidnight = punch.calendar_date && attendanceDate && punch.calendar_date !== attendanceDate;

  return (
    <Popover trigger="hover" placement="top" isLazy>
      <PopoverTrigger>
        <Box as="span" display="inline-block" lineHeight="1.15" cursor="default" tabIndex={0} aria-label={`${punch.time} at ${location}`}>
          <Text as="span" display="block" fontSize="sm" fontFamily="mono">
            {punch.time}
          </Text>
          <Text as="span" display="block" fontSize="xs" color="gray.500" className="punch-location">
            {location}
          </Text>
        </Box>
      </PopoverTrigger>
      <PopoverContent w="auto" maxW="320px" fontSize="xs">
        <PopoverArrow />
        <PopoverBody>
          <Stack spacing={0.5}>
            <Text><b>Punch location:</b> {punch.punch_outlet || location}</Text>
            <Text><b>Device:</b> {punch.device_label || "-"}</Text>
            <Text><b>Cloud ID:</b> <span style={{ fontFamily: "monospace" }}>{punch.dev_id}</span></Text>
            <Text><b>Punched at:</b> {punch.io_time}</Text>
            {crossedMidnight ? (
              <Text><b>Calendar date:</b> {displayDate(punch.calendar_date)} (counted towards {displayDate(attendanceDate)} by the shift&apos;s Attendance Day Cutoff {punch.cutoff_applied || ""})</Text>
            ) : null}
            {punch.source_ip ? <Text><b>Source IP:</b> {punch.source_ip}</Text> : null}
          </Stack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
