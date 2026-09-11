import React, { useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Link as ChakraLink, Spinner, Stack, Text } from "@chakra-ui/react";
import { SectionCard, Field, FieldGrid } from "./SectionCard";
import DocumentHelper from "../../../helper/document";
import { IdCardType } from "../../../constants/values";
import { maskIdentifier } from "../../../util/hrProfile";

/**
 * M1 — section 8 of the employee master: Documents. LAST, and READ-ONLY.
 *
 * Reuses the existing document read (`GET /document/employee_id`, behind
 * `view_documents`) and nothing more. Uploading and verifying stay where they
 * are today; a standalone Employee Documents module is not this change.
 *
 * WHAT THE BACKEND ALREADY GUARANTEES, and this component leans on rather
 * than repeats: a caller without `view_employee_sensitive` never receives an
 * Aadhaar or PAN document row at all - B3 drops the whole row, scan path
 * included - so what arrives here is what this caller may see. The number is
 * still shown masked, because a document number on a screen in a shop needs
 * no more than its ending to be recognised.
 */
const typeLabel = (cardType) => {
  const found = IdCardType.find((t) => Number(t.id) === Number(cardType));
  if (found) return found.value;
  return cardType === undefined || cardType === null || cardType === "" ? "Document" : `Type ${cardType}`;
};

function DocumentsSection({ employeeId, canView }) {
  const [rows, setRows] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ok | denied | error

  useEffect(() => {
    if (!employeeId || !canView) return undefined;
    let cancelled = false;
    setState("loading");
    DocumentHelper.getDocType(employeeId)
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err && err.response && err.response.status;
        setState(code === 403 ? "denied" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, canView]);

  return (
    <SectionCard
      title="Documents"
      subtitle="Documents on file for this employee."
      canView={canView}
      deniedMessage="You do not have permission to view this employee's documents."
    >
      {state === "loading" ? (
        <Spinner size="sm" />
      ) : state === "denied" ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view this employee&apos;s documents.
        </Alert>
      ) : state === "error" ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          Documents could not be loaded.
        </Alert>
      ) : rows && rows.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No documents on file.
        </Text>
      ) : (
        <Stack spacing={3}>
          {(rows || []).map((d, i) => (
            <Box key={`${d.card_type}-${i}`} borderWidth="1px" borderRadius="md" p={3}>
              <FieldGrid columns={{ base: 1, md: 3 }}>
                <Field label="Document" value={typeLabel(d.card_type)} />
                <Field label="Name on document" value={d.card_name} />
                <Field label="Number" value={maskIdentifier(d.card_number)} mono />
              </FieldGrid>
              {d.file ? (
                <ChakraLink href={d.file} isExternal fontSize="xs" color="purple.600" mt={2} display="inline-block">
                  Open file
                </ChakraLink>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export default DocumentsSection;
