import React, { useEffect, useMemo, useState } from "react";
import { FormControl, FormErrorMessage, FormLabel, Text } from "@chakra-ui/react";
import SearchableDropdown from "../customInput/SearchableDropdown";
import { getTransporterOptions } from "../../helper/lrFollowup";
import { transporterOptions } from "../../util/lrFollowup";

/**
 * The one transporter picker, used by Create LR Follow-up and by the
 * LR / dispatch update of every follow-up (Advance and Manual alike).
 *
 * Offers ACTIVE transporters from the Transporter Master, shown as name and
 * contact number. A record that already holds a transporter which has since
 * been made inactive keeps showing it, labelled inactive; the server refuses
 * it as a new choice anyway.
 *
 * `current` is the record's transporter as the API returned it
 * (transporter_id, transporter_name, transporter_contact_no).
 */
function TransporterSelect({ value, onChange, current = null, label = "Transporter", isRequired = false, error }) {
  const [active, setActive] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTransporterOptions()
      .then((body) => {
        if (cancelled) return;
        if (body && body.code === 200) setActive(body.data || []);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => transporterOptions(active, current), [active, current]);

  return (
    <FormControl isRequired={isRequired} isInvalid={Boolean(error)}>
      <FormLabel fontSize="sm" mb="4px">
        {label}
      </FormLabel>
      <SearchableDropdown
        options={options}
        value={value ? Number(value) : null}
        onChange={(id) => onChange(id ? Number(id) : null)}
        placeholder="Search transporter by name or number"
      />
      {failed && (
        <Text fontSize="xs" color="red.500" mt="4px">
          Could not load the Transporter Master.
        </Text>
      )}
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
}

export default TransporterSelect;
