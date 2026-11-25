import React from "react";
import Link from "next/link";
import { Alert, AlertIcon, Stack, Text } from "@chakra-ui/react";
import { bannerItems } from "../../util/attendanceRaw";

/**
 * What could not be placed on the Attendance List, and where to fix it.
 *
 * Each line is a count and two links: the EXISTING screen that resolves the
 * cause - Employee Shift Assignment, Work Shift Master, Employees, Devices -
 * and the Review Queue.
 *
 * THE REVIEW QUEUE LINK IS A REAL LINK NOW. It used to be an in-page handler
 * that switched to the Punch Audit tab and passed nothing at all, so every
 * warning landed on the same unfiltered audit and the reader had to rebuild
 * the filter from the sentence they had just read. It is now an href that
 * opens the audit in Review Only, narrowed to the issue this warning counted
 * and over the same date range - so it is also shareable, bookmarkable and
 * survives Back, which a handler never was.
 *
 * Nothing is fixed from here and nothing is guessed: an undatable punch stays
 * in the review queue until the configuration is corrected and the range is
 * re-derived (which Recalculate now does).
 */
export default function AttendanceBanners({ meta, canAudit = true }) {
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
            {canAudit && item.reviewHref ? (
              <>
                {" · "}
                <Link href={item.reviewHref} passHref>
                  <a
                    style={{ textDecoration: "underline" }}
                    title="Open the Punch Audit in Review Only, filtered to these punches"
                  >
                    Review queue
                  </a>
                </Link>
              </>
            ) : null}
          </Text>
        </Alert>
      ))}
    </Stack>
  );
}
