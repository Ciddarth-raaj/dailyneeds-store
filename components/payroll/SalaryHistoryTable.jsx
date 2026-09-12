import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import SalaryBreakup from "./SalaryBreakup";
import { presentHistory } from "../../util/salaryHistoryView";

/**
 * M4 — the permanent salary history, newest first.
 *
 * PERMANENT IS THE POINT. There is no delete here and none on the server: a
 * salary history that can be deleted is not a history. A rejected proposal
 * stays on the record AS a rejected proposal, with who refused it and why,
 * because that is exactly the thing somebody will need to find in two years.
 *
 * NOTHING ON THIS TABLE IS EDITABLE. Approved history is immutable; a
 * correction to an approved salary is a NEW revision that somebody has to
 * approve. The only editable record in the whole module is a PENDING one, and
 * it is edited in the form above this table.
 *
 * FIVE STATUSES, AND NOT ONE OF THEM IS DECIDED BY THE BROWSER'S CLOCK - see
 * `util/salaryHistoryView.js`. "Current" is identity against the record the
 * server's resolver returned; everything else is positioned relative to that.
 *
 * EACH ROW OPENS INTO ITS FULL AUDIT: the four components, both employee
 * deductions, all five employer costs, the CTC, the reason the pay changed,
 * the reason the breakup was overridden if it was, and who created, approved
 * or rejected it and when. A history that shows only a gross is a list of
 * numbers nobody can check.
 */

/** One labelled fact. */
function Fact({ label, children }) {
  return (
    <Box minW="0">
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800" wordBreak="break-word">
        {children}
      </Text>
    </Box>
  );
}

function HistoryRow({ row }) {
  const [open, setOpen] = useState(false);

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={3}>
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        spacing={2}
      >
        <Stack direction="row" align="center" spacing={3} flexWrap="wrap">
          {row.badge ? (
            <Badge colorScheme={row.badge.colorScheme} fontSize="9px">
              {row.badge.label}
            </Badge>
          ) : null}
          <Text fontSize="sm" fontWeight="bold">
            {row.monthly_gross}
          </Text>
          <Text fontSize="xs" color="gray.600">
            effective {row.effective_from}
          </Text>
          <Badge variant="outline" colorScheme="gray" fontSize="9px">
            {row.source_label}
          </Badge>
          {row.manual_override ? (
            <Badge colorScheme="purple" fontSize="9px">
              Manual breakup
            </Badge>
          ) : null}
        </Stack>

        <Button size="xs" variant="ghost" colorScheme="purple" onClick={() => setOpen(!open)}>
          {open ? "Hide detail" : "Show detail"}
        </Button>
      </Stack>

      {/* The reason the pay changed is on the row itself rather than behind the
          toggle: it is the first thing anybody reading a history wants. */}
      {row.revision_reason ? (
        <Text fontSize="xs" color="gray.700" mt={2}>
          <Text as="span" color="gray.500">
            Reason:{" "}
          </Text>
          {row.revision_reason}
        </Text>
      ) : null}

      {open ? (
        <Stack spacing={3} mt={3}>
          <Divider />
          <SalaryBreakup view={row.figures} compact />

          {row.manual_override ? (
            <Fact label="Manual override reason">
              {row.override_reason || "not recorded"}
            </Fact>
          ) : null}

          <Divider />
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            {row.audit.map((step) => (
              <Box key={step.key} minW="0">
                <Text
                  fontSize="10px"
                  textTransform="uppercase"
                  letterSpacing="0.04em"
                  color="gray.500"
                >
                  {step.label}
                </Text>
                <Text fontSize="sm" color="gray.800">
                  {step.who}
                </Text>
                <Text fontSize="10px" color="gray.500">
                  {step.at || "time not recorded"}
                </Text>
                {step.note ? (
                  <Text fontSize="xs" color="red.600" mt={0.5}>
                    {step.note}
                  </Text>
                ) : null}
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      ) : null}
    </Box>
  );
}

function SalaryHistoryTable({ history, current }) {
  const rows = presentHistory(history, current);

  if (rows.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600">
        No salary has been proposed for this employee yet.
      </Text>
    );
  }

  return (
    <Stack spacing={2}>
      {rows.map((row) => (
        <HistoryRow key={row.salary_id} row={row} />
      ))}
    </Stack>
  );
}

export default SalaryHistoryTable;
