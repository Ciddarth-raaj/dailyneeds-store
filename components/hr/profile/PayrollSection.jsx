import React from "react";
import { Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

/**
 * M1 — section 7 of the employee master: Payroll. POSITION ONLY.
 *
 * The employee master will show the currently effective, approved salary
 * here - summary, structure, deductions, employer contributions, CTC - once
 * the salary engine (M2) and this view (M3) exist. Until then the section
 * holds its place in the order so the profile reads the same before and
 * after, and it shows nothing: no figure, no editor, no second place for a
 * salary to be typed. Salary changes will happen only through Payroll's own
 * Salary Revision and Approval screens, never on this card.
 */
function PayrollSection() {
  return (
    <SectionCard title="Payroll" subtitle="Current effective salary, as approved through Payroll.">
      <Text fontSize="sm" color="gray.600">
        Salary information will appear here once Payroll setup is complete. Salary is entered,
        revised and approved from the Payroll menu, not on this record.
      </Text>
    </SectionCard>
  );
}

export default PayrollSection;
