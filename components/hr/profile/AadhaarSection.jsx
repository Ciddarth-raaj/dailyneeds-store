import React from "react";
import { Badge, Button, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";
import { aadhaarSectionView } from "../../../util/hrStatus";

/**
 * M1 — section 1 of the employee master: Aadhaar Verification.
 *
 * FIRST on the profile for the same reason it is first in Add Employee: it is
 * the identity the record hangs off, and the one section whose answer can
 * mean "this is somebody else's employee ID". It was a half-width card beside
 * Statutory; it is now the first full-width section, in the same order a
 * store manager met it.
 *
 * THE VERIFIED NAME IS SHOWN, and is not the same field as the employee's
 * name. `Name as per Aadhaar` is the verified legal identity; the Employee
 * Name on Personal Details is the operational one and stays editable.
 * Keeping the two apart is what stops a later rename losing the verified
 * name, which is exactly what used to happen.
 *
 * NEVER RENDERED: the full number, any ciphertext or fingerprint. The status
 * read returns VERIFIED/PENDING and the last four digits, and that is all
 * this section has to show. `view_aadhaar_full` is granted to nobody, so
 * there is no reveal affordance at all.
 *
 * A FAILED READ IS NOT "NO AADHAAR ON RECORD". This card used to be handed a
 * bare payload that was `null` for every failure, and it read that null as
 * PENDING - so a store manager without `view_employee_lifecycle`, the key
 * that gates the Aadhaar status endpoint, was told no Aadhaar existed. It now
 * takes the whole `util/sectionLoad.js` OUTCOME and asks
 * `aadhaarSectionView` what may be said: only a server that actually says
 * PENDING produces "No Aadhaar on record", and a refusal reads "Aadhaar
 * status not available with your access" while disclosing nothing.
 */
function AadhaarSection({ aadhaarOutcome, canVerify, onVerify }) {
  const view = aadhaarSectionView(aadhaarOutcome);
  const data = (aadhaarOutcome && aadhaarOutcome.data) || {};

  return (
    <SectionCard
      title="Aadhaar Verification"
      badge={<Badge colorScheme={view.badge.colorScheme}>{view.badge.label}</Badge>}
    >
      <Stack spacing={3} fontSize="sm">
        {view.showIdentity ? (
          <>
            <Text>
              Verified, ending <strong>{data.aadhaar_last4}</strong>.
            </Text>
            {data.name_as_per_aadhaar ? (
              <Text>
                Name as per Aadhaar: <strong>{data.name_as_per_aadhaar}</strong>
              </Text>
            ) : null}
            <Text color="gray.600">
              The full number is encrypted and is not shown anywhere in this application.
            </Text>
          </>
        ) : (
          <>
            <Text color="gray.600">{view.message}</Text>
            {canVerify && view.canOfferVerify ? (
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
