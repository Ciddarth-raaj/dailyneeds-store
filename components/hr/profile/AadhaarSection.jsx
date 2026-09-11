import React from "react";
import { Button, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";
import { AadhaarBadge } from "../StatusBadges";

/**
 * M1 — section 1 of the employee master: Aadhaar Verification.
 *
 * FIRST on the profile for the same reason it is first in Add Employee: it is
 * the identity the record hangs off, and the one section whose answer can
 * mean "this is somebody else's employee ID". It was a half-width card beside
 * Statutory; it is now the first full-width section, in the same order a
 * store manager met it.
 *
 * NEVER RENDERED: the full number, any ciphertext or fingerprint. The status
 * read returns VERIFIED/PENDING and the last four digits, and that is all
 * this section has to show. `view_aadhaar_full` is granted to nobody, so
 * there is no reveal affordance at all.
 */
function AadhaarSection({ aadhaar, canVerify, onVerify }) {
  const verified = aadhaar && aadhaar.aadhaar_status === "VERIFIED";
  return (
    <SectionCard
      title="Aadhaar Verification"
      badge={<AadhaarBadge status={aadhaar ? aadhaar.aadhaar_status : "PENDING"} />}
    >
      <Stack spacing={3} fontSize="sm">
        {verified ? (
          <>
            <Text>
              Verified, ending <strong>{aadhaar.aadhaar_last4}</strong>.
            </Text>
            <Text color="gray.600">
              The full number is encrypted and is not shown anywhere in this application.
            </Text>
          </>
        ) : (
          <>
            <Text color="gray.600">
              {aadhaar && aadhaar.message
                ? aadhaar.message
                : "No Aadhaar on record. This does not hold up anything else."}
            </Text>
            {canVerify && aadhaar && aadhaar.can_verify_now ? (
              <Button size="sm" colorScheme="purple" alignSelf="flex-start" onClick={onVerify}>
                Verify now
              </Button>
            ) : null}
          </>
        )}
      </Stack>
    </SectionCard>
  );
}

export default AadhaarSection;
