import React from "react";
import Link from "next/link";
import { Alert, AlertIcon, Stack, Text } from "@chakra-ui/react";
import { bannerItems } from "../../util/attendanceRaw";

/**
 * What could not be placed on the Attendance List, and where to fix it.
 *
 * Each line is a count and a link to the EXISTING screen that resolves the
 * cause - Employee Shift Assignment, Work Shift Master, Employees, Devices.
 * Nothing is fixed from here and nothing is guessed: an undatable punch stays
 * in the review queue (Punch Audit) until the configuration is corrected and
 * an administrator re-derives the range.
 */
export default function AttendanceBanners({ meta, onOpenAudit }) {
  const items = bannerItems(meta);
  if (items.length === 0) return null;
  return (
    <Stack spacing={2} mb={4}>
      {items.map((item) => (
        <Alert key={item.key} status="info" fontSize="sm" borderRadius="md">
          <AlertIcon />
          <Text>
            {item.text}{" "}
            <Link href={item.href} passHref>
              <a style={{ textDecoration: "underline" }}>{item.linkText}</a>
            </Link>
            {onOpenAudit ? (
              <>
                {" · "}
                <a href="#audit" onClick={(e) => { e.preventDefault(); onOpenAudit(); }} style={{ textDecoration: "underline" }}>
                  Review queue
                </a>
              </>
            ) : null}
          </Text>
        </Alert>
      ))}
    </Stack>
  );
}
