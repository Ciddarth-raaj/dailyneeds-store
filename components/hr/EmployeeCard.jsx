import React from "react";
import Link from "next/link";
import { Avatar, Box, Divider, Stack, Text } from "@chakra-ui/react";
import { EmploymentBadge } from "./StatusBadges";

/**
 * One employee, as a card on the Employee Master list.
 *
 * WHAT IT IS FOR: finding a person. Somebody scanning this grid is looking
 * for a face, a name and an Employee ID, and then for where that person
 * works. That is the whole job, and the card is ordered by it:
 *
 *   1  Employee ID     first and prominent, because it is what HR, payroll,
 *                      attendance and the stores all refer to somebody by,
 *                      and it is what gets read out over the phone. It is the
 *                      permanent code that survives every resignation and
 *                      rejoin.
 *   2  Photo           the fastest identification there is.
 *   3  Name
 *   4  Location / Outlet
 *   5  Department
 *   6  Designation
 *   7  Employment status  Active or Resigned.
 *
 * ROLE IS NOT SHOWN. Designation is what the employee master records and what
 * the rest of the application is organised by; a "role" beside it is a second
 * answer to the same question and nobody could say which one was right.
 *
 * THE ONBOARDING AND COMPLIANCE BADGES ARE NOT HERE ANY MORE - Aadhaar
 * Verified, Bank Ready/Pending, HR Pending/Complete. They are not deleted from
 * the system and no data behind them changed: they are on the employee's
 * profile as before, on the list view's own columns, and they are the whole
 * subject of the Onboarding / Pending HR work queue at `/hr/onboarding`. What
 * changed is only that a card meant for finding somebody stopped carrying
 * three badges about chasing them. Two different jobs, two screens.
 *
 * NOTHING SENSITIVE, unchanged: no Aadhaar digits, no account number, no
 * salary, no mobile number. The card takes only what the employee list
 * already returns.
 */
function EmployeeCard({ employee }) {
  const line = (label, value) => (
    <Box minW="0">
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800" noOfLines={1} title={value || undefined}>
        {value || "—"}
      </Text>
    </Box>
  );

  return (
    <Link href={`/hr/employees/${employee.employee_id}`} passHref>
      <Box
        as="a"
        display="block"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        bg="white"
        p={4}
        transition="all 0.15s ease"
        _hover={{ borderColor: "purple.300", boxShadow: "md", transform: "translateY(-2px)" }}
        _focusVisible={{ outline: "2px solid", outlineColor: "purple.500", outlineOffset: "2px" }}
      >
        <Stack spacing={3}>
          {/* ---------------------------------------- 1. the Employee ID
              Top of the card and the largest thing on it. Monospaced so a run
              of ids down a column lines up and can be compared at a glance. */}
          <Stack direction="row" justify="space-between" align="center" spacing={3}>
            <Text
              fontFamily="mono"
              fontWeight="bold"
              fontSize="xl"
              lineHeight="1.1"
              color="gray.900"
              noOfLines={1}
            >
              {employee.employee_id}
            </Text>
            {/* ------------------------------------ 7. employment status */}
            <EmploymentBadge status={employee.status} />
          </Stack>

          <Divider />

          {/* ------------------------------------ 2. photo and 3. name
              The photo is the employee's own `employee_image`, which the
              employee list already returns. Where there is none, Chakra draws
              the initials from the name rather than a broken image. */}
          <Stack direction="row" spacing={3} align="center">
            <Avatar
              size="md"
              name={employee.employee_name || undefined}
              src={employee.employee_image || undefined}
            />
            <Box minW="0">
              <Text fontWeight="semibold" fontSize="md" color="gray.900" noOfLines={2}>
                {employee.employee_name || "Unnamed"}
              </Text>
            </Box>
          </Stack>

          {/* ------------- 4. location, 5. department, 6. designation
              One column on a phone, two from `sm` up - the grid the list puts
              these cards in is already responsive, and a two-column row inside
              a narrow card is how the values get truncated to nothing. */}
          <Stack
            direction={{ base: "column", sm: "row" }}
            spacing={{ base: 2, sm: 4 }}
            align="stretch"
          >
            <Box flex="1" minW="0">
              {line("Location", employee.store_name)}
            </Box>
            <Box flex="1" minW="0">
              {line("Department", employee.department_name)}
            </Box>
          </Stack>
          {line("Designation", employee.designation_name)}
        </Stack>
      </Box>
    </Link>
  );
}

export default EmployeeCard;
