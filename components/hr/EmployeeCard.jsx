import React from "react";
import Link from "next/link";
import { Badge, Box, Divider, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { AadhaarListBadge, BankListBadge, EmploymentBadge } from "./StatusBadges";

/**
 * Stage 0C / C3 — one employee, as a card.
 *
 * WHAT IS ON IT, and nothing else: name, designation, branch, department, the
 * permanent employee ID, whether they are employed, and the two statuses HR
 * chases. Everything else about the person is one click away on their profile,
 * and putting it here would turn a scannable card into a small table.
 *
 * The ID is shown deliberately rather than hidden as a link target: it is the
 * permanent employee code that survives every resignation and rejoin, and it
 * is what HR says out loud to each other and writes on forms.
 *
 * NOTHING SENSITIVE. No Aadhaar digits, no account number, no salary - the
 * card renders statuses, which is what the bulk summary returns.
 */
function EmployeeCard({ employee, status = {} }) {
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
          {/* -------------------------------------------- who they are */}
          <Stack direction="row" justify="space-between" align="flex-start" spacing={3}>
            <Box minW="0">
              <Text fontWeight="semibold" fontSize="md" color="gray.900" noOfLines={1}>
                {employee.employee_name || "Unnamed"}
              </Text>
              <Text fontSize="sm" color="purple.600" noOfLines={1}>
                {employee.designation_name || "No designation"}
              </Text>
            </Box>
            <EmploymentBadge status={employee.status} />
          </Stack>

          <Divider />

          {/* ------------------------------------------- where they are */}
          <Stack direction="row" spacing={4}>
            <Box flex="1" minW="0">
              {line("Branch", employee.store_name)}
            </Box>
            <Box flex="1" minW="0">
              {line("Department", employee.department_name)}
            </Box>
          </Stack>

          {/* --------------------------------- the ID, and what HR chases */}
          <Wrap spacing={2} align="center" shouldWrapChildren>
            <WrapItem>
              <Badge colorScheme="gray" variant="subtle" fontFamily="mono">
                ID {employee.employee_id}
              </Badge>
            </WrapItem>
            <WrapItem>
              <Stack direction="row" spacing={1} align="center">
                <Text fontSize="10px" color="gray.500" textTransform="uppercase">
                  Aadhaar
                </Text>
                <AadhaarListBadge status={status.aadhaar_status} />
              </Stack>
            </WrapItem>
            <WrapItem>
              <Stack direction="row" spacing={1} align="center">
                <Text fontSize="10px" color="gray.500" textTransform="uppercase">
                  Bank
                </Text>
                <BankListBadge
                  status={status.bank_status}
                  payrollReady={status.bank_payroll_ready}
                />
              </Stack>
            </WrapItem>
          </Wrap>
        </Stack>
      </Box>
    </Link>
  );
}

export default EmployeeCard;
