import React from "react";
import { Badge, Tooltip } from "@chakra-ui/react";
import {
  aadhaarBadge,
  bankBadge,
  employmentBadge,
  confidenceBadge,
} from "../../util/hrStatus";

/**
 * Stage 0C / C3 — the status badges, in one place.
 *
 * The list and the profile must never disagree about what "Pending" looks
 * like, and every mapping lives in `util/hrStatus.js` so it can be tested
 * without a React runner.
 */

export function AadhaarBadge({ status }) {
  const b = aadhaarBadge(status);
  return <Badge colorScheme={b.colorScheme}>{b.label}</Badge>;
}

export function BankBadge({ status, tooltip }) {
  const b = bankBadge(status);
  const badge = <Badge colorScheme={b.colorScheme}>{b.label}</Badge>;
  return tooltip ? (
    <Tooltip label={tooltip} hasArrow>
      <span>{badge}</span>
    </Tooltip>
  ) : (
    badge
  );
}

export function EmploymentBadge({ status }) {
  const b = employmentBadge(status);
  return <Badge colorScheme={b.colorScheme}>{b.label}</Badge>;
}

export function ConfidenceBadge({ confidence }) {
  const b = confidenceBadge(confidence);
  return <Badge colorScheme={b.colorScheme}>{b.label}</Badge>;
}

export default { AadhaarBadge, BankBadge, EmploymentBadge, ConfidenceBadge };
