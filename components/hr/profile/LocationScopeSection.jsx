import React, { useState } from "react";
import { Alert, AlertIcon, Badge, Button, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

/**
 * Whether this employee's duty is tied to ONE outlet.
 *
 * WHAT THE TWO ANSWERS MEAN, said on the card rather than left to be
 * discovered. `new_employee.store_id` has always carried two facts at once:
 * which branch OWNS the record — authorization scope, the directory, reporting
 * lines — and where the person is EXPECTED TO STAND during their shift. For an
 * area or operations role those are different places, and counting somebody
 * whose work is the whole chain into the Expected Now of the one branch that
 * happens to hold their record manufactures a permanent staffing gap nobody
 * can close, plus a "recorded IN elsewhere — verification needed" every time
 * they visit a branch.
 *
 * SETTING THIS TO `All Locations` CHANGES EXACTLY ONE THING: which outlet's
 * Expected Now and Gap they are counted into — none of them, individually.
 * They keep their branch, so their own manager still sees them.
 *
 * WHAT IT DOES NOT MEAN: exempt from attendance, resigned, inactive, or
 * salary-stopped. Attendance exemption is the separate `Attendance Required`
 * card, and the two are independent: a roaming employee still has a shift,
 * still punches, still appears in attendance, in the Missing Attendance Report
 * and in payroll.
 *
 * IT IS A PER-EMPLOYEE FACT AND NOT A JOB TITLE. Nothing in this system reads
 * a designation to decide it, here or on the server — a title one person holds
 * today three people hold next year, two of whom sit in one building.
 *
 * ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL. Everybody who may see
 * the profile sees the value; only an administrator is offered the switch. The
 * server enforces `user_type = 2` directly (`middlewares/admin_only.js`)
 * rather than through a permission key, because a key is grantable and a Store
 * Manager must not be able to move somebody out of their own branch's
 * staffing figures — so hiding the button is a courtesy, not the boundary.
 */
function LocationScopeSection({ value, outletName, isAdmin = false, onChange, saving = false }) {
  const [pending, setPending] = useState(false);
  const roaming = value === true;

  const toggle = async () => {
    setPending(true);
    try {
      await onChange(!roaming);
    } finally {
      setPending(false);
    }
  };

  return (
    <SectionCard
      title="Duty Location"
      badge={
        <Badge colorScheme={roaming ? "purple" : "green"} variant="subtle" fontSize="9px">
          {roaming ? "All Locations / Roaming" : "Fixed outlet"}
        </Badge>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {roaming ? (
          <>
            <Text color="gray.600">
              This employee works across outlets. They are counted in no single outlet&apos;s
              Expected Now and can create no single outlet&apos;s staffing gap, and a punch at any
              location counts as recorded IN for them. They are shown on the Attendance &amp;
              Staffing dashboard under &ldquo;All Locations / Roaming&rdquo;.
            </Text>
            <Alert status="info" fontSize="xs" borderRadius="md">
              <AlertIcon />
              This employee remains active, rostered on a shift and expected to punch. They still
              appear in attendance, in the Missing Attendance Report and in payroll. This is not an
              attendance exemption, a resignation or a salary stop, and
              {outletName ? ` ${outletName}` : " their branch"} remains the branch that owns their
              record.
            </Alert>
          </>
        ) : (
          <Text color="gray.600">
            This employee is expected at{" "}
            {outletName ? <b>{outletName}</b> : "the outlet on their record"} during their shift.
            Their shift counts towards that outlet&apos;s Expected Now, and a punch at a different
            location is reported for verification.
          </Text>
        )}

        {isAdmin ? (
          <Button
            size="xs"
            variant="outline"
            alignSelf="flex-start"
            onClick={toggle}
            isLoading={pending || saving}
          >
            {roaming ? "Set Duty Location to a fixed outlet" : "Set Duty Location to All Locations"}
          </Button>
        ) : (
          <Text fontSize="10px" color="gray.500">
            Only an administrator can change this.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

export default LocationScopeSection;
