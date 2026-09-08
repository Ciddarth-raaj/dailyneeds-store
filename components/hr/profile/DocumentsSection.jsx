import React from "react";
import { Badge, Box, Button, Link as ChakraLink, Stack, Text, Alert, AlertIcon } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

/**
 * Stage 0C / C3 — the employee's documents.
 *
 * READ-ONLY, and gated on `view_documents`.
 *
 * B3 IS ALREADY DOING THE HARD PART. A document whose `card_type` is Aadhaar
 * or PAN is a sensitive document row, and `filterResponse` DROPS THE WHOLE ROW
 * - not just its number - for a caller without `view_employee_sensitive`.
 * So this component never has to decide what to hide: what arrives is what the
 * caller is entitled to. It must simply not undo that, which means never
 * printing a card number and never linking a file the backend withheld.
 *
 * The card number is deliberately not shown at all. The document list answers
 * "what do we hold for this person"; reading the number off it is the job of
 * the document screen, which has its own permissions.
 *
 * ESS document visibility - deciding which of these an EMPLOYEE may see - is
 * a separate, future concern. `new_employee_documents` carries no visibility
 * metadata today, and nothing here assumes any.
 */
const CARD_TYPE_LABELS = {
  1: "Aadhaar Card",
  2: "Driving Licence",
  3: "Voter ID",
  4: "PAN",
};

const SENSITIVE_CARD_TYPES = new Set([1, 4]);

const labelFor = (cardType) => CARD_TYPE_LABELS[Number(cardType)] || "Document";

function DocumentsSection({ documents, canView, loading, error }) {
  const rows = Array.isArray(documents) ? documents : [];

  return (
    <SectionCard
      title="Documents"
      subtitle="What HR holds for this employee."
      canView={canView}
      deniedMessage="You do not have permission to view this employee's documents."
    >
      {loading ? (
        <Text fontSize="sm" color="gray.500">
          Loading…
        </Text>
      ) : error ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          The document list could not be loaded. Nothing else on this page is affected.
        </Alert>
      ) : rows.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No documents are on record for this employee, or none that you may see.
        </Text>
      ) : (
        <Stack spacing={2}>
          {rows.map((d, i) => (
            <Box
              key={`${d.card_type}-${i}`}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              px={3}
              py={2}
            >
              <Stack direction="row" justify="space-between" align="center" spacing={3}>
                <Stack direction="row" align="center" spacing={2} minW="0">
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {labelFor(d.card_type)}
                  </Text>
                  {SENSITIVE_CARD_TYPES.has(Number(d.card_type)) ? (
                    <Badge colorScheme="orange" variant="subtle" fontSize="9px">
                      Sensitive
                    </Badge>
                  ) : null}
                  {d.card_name ? (
                    <Text fontSize="xs" color="gray.600" noOfLines={1}>
                      {d.card_name}
                    </Text>
                  ) : null}
                </Stack>

                {d.file ? (
                  <ChakraLink href={d.file} isExternal>
                    <Button size="xs" variant="outline" colorScheme="purple">
                      Open
                    </Button>
                  </ChakraLink>
                ) : (
                  <Text fontSize="xs" color="gray.400">
                    no file
                  </Text>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Text fontSize="xs" color="gray.500" mt={3}>
        Document numbers are not shown here. Aadhaar and PAN records are withheld entirely unless you
        hold sensitive access.
      </Text>
    </SectionCard>
  );
}

export default DocumentsSection;
