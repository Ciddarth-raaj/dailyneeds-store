import React from "react";
import { Alert, AlertIcon, Box, Checkbox, Stack, Text } from "@chakra-ui/react";

/**
 * Reports — what changed since this report was saved.
 *
 * A saved report is an INSTRUCTION, not a snapshot. Between saving it and
 * running it a branch may have closed, a designation may have been deleted, or
 * the person running it may have lost a permission. The server revalidates
 * everything on every run and reports what it could not apply; this shows it.
 *
 * ================================= WHY ONE WARNING IS LOUDER THAN THE REST ==
 *
 * Most stale values narrow or do nothing: a column the caller may no longer
 * see is dropped, an inactive-but-existing outlet is kept and merely flagged.
 * One case does the opposite.
 *
 *   A report filtered to ONE outlet. That outlet is deleted. Dropping the
 *   stale value leaves no outlet filter at all - which does not mean "no
 *   results", it means EVERY outlet. Silently, a one-branch report becomes a
 *   whole-company export.
 *
 * So warnings that can BROADEN the population are separated out and shown in
 * red, and an export carrying one is refused by the server until the box below
 * is ticked. Preview is not gated: looking at a wider set on screen is not the
 * risk, taking it out of the building is.
 */
function ReportWarnings({ warnings, requiresAcknowledgement, acknowledged, onAcknowledge }) {
  const list = Array.isArray(warnings) ? warnings : [];
  if (list.length === 0) return null;

  const widening = list.filter((w) => w && w.widens_result_set === true);
  const other = list.filter((w) => !w || w.widens_result_set !== true);

  return (
    <Stack spacing="8px" marginBottom="12px">
      {widening.length > 0 && (
        <Alert status="warning" borderRadius="8px" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold" fontSize="14px">
              This report now covers more employees than it was saved to cover
            </Text>
            <Stack spacing="2px" marginTop="4px">
              {widening.map((w, i) => (
                <Text key={`${w.type}-${w.field}-${i}`} fontSize="13px">
                  {w.message}
                </Text>
              ))}
            </Stack>

            {requiresAcknowledgement && (
              <Checkbox
                marginTop="8px"
                size="sm"
                isChecked={Boolean(acknowledged)}
                onChange={(e) => onAcknowledge(e.target.checked)}
              >
                I understand, and want to export the wider set anyway
              </Checkbox>
            )}
          </Box>
        </Alert>
      )}

      {other.length > 0 && (
        <Alert status="info" borderRadius="8px" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold" fontSize="14px">
              Some saved settings could not be applied exactly
            </Text>
            <Stack spacing="2px" marginTop="4px">
              {other.map((w, i) => (
                <Text key={`${w.type}-${w.field}-${i}`} fontSize="13px">
                  {w.message}
                </Text>
              ))}
            </Stack>
          </Box>
        </Alert>
      )}
    </Stack>
  );
}

export default ReportWarnings;
