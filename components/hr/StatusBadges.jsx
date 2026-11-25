import React from "react";
import { Badge, Tooltip } from "@chakra-ui/react";
import {
  aadhaarBadge,
  aadhaarListBadge,
  bankBadge,
  bankListBadge,
  employmentBadge,
  confidenceBadge,
} from "../../util/hrStatus";
import { hrOnboardingBadge, hrOnboardingMissingLabel } from "../../util/hrOnboarding";

/**
 * Stage 0C / C3 — the status badges, in one place.
 *
 * The list and the profile must never disagree about what "Pending" looks
 * like, and every mapping lives in a plain module - `util/hrStatus.js`, and
 * `util/hrOnboarding.js` for the onboarding one - so it can be tested without
 * a React runner.
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

/**
 * The compact list versions. Same mappings, shorter labels, and a neutral
 * dash where the status summary has not arrived - so a row never claims
 * "Pending" for something it simply does not know yet.
 */
export function AadhaarListBadge({ status }) {
  const b = aadhaarListBadge(status);
  return (
    <Badge colorScheme={b.colorScheme} variant={b.unknown ? "outline" : "subtle"}>
      {b.label}
    </Badge>
  );
}

export function BankListBadge({ status, payrollReady, tooltip }) {
  const b = bankListBadge(status, payrollReady);
  const badge = (
    <Badge colorScheme={b.colorScheme} variant={b.unknown ? "outline" : "subtle"}>
      {b.label}
    </Badge>
  );
  return tooltip ? (
    <Tooltip label={tooltip} hasArrow>
      <span>{badge}</span>
    </Tooltip>
  ) : (
    badge
  );
}

/**
 * Whether HR has finished onboarding this employee - the statutory and bank
 * sections a store manager does not complete and cannot see.
 *
 * Renders NOTHING when the state is not known, rather than a dash: unlike
 * Aadhaar and Bank this is not a column every employee has an answer for, and
 * an outline dash in every row would be noise.
 */
export function HrOnboardingBadge({ pending, missing }) {
  const b = hrOnboardingBadge(pending);
  if (!b) return null;
  const label = pending ? hrOnboardingMissingLabel(missing) : "";
  const badge = <Badge colorScheme={b.colorScheme}>{b.label}</Badge>;
  return label ? (
    <Tooltip label={label} hasArrow>
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

export default {
  AadhaarBadge,
  AadhaarListBadge,
  BankBadge,
  BankListBadge,
  HrOnboardingBadge,
  EmploymentBadge,
  ConfidenceBadge,
};
