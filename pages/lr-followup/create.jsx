import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  Textarea,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import SearchableDropdown from "../../components/customInput/SearchableDropdown";
import TransporterSelect from "../../components/lrFollowup/TransporterSelect";
import { useDistributors } from "../../customHooks/useDistributors";
import { createManualFollowup, unwrap } from "../../helper/lrFollowup";
import { followupRef, localToday, newRequestKey, validateManualFollowup } from "../../util/lrFollowup";

const EMPTY = {
  distributor_code: null,
  transporter_id: null,
  lr_no: "",
  dispatch_date: "",
  expected_delivery_date: "",
  remarks: "",
};

/**
 * Create LR Follow-up - for goods a supplier dispatches on credit. Saving
 * opens the follow-up directly; from then on it is worked exactly like one
 * opened by a paid Advance Request. Delivery is always to the Warehouse, so
 * there is no outlet to choose, and no bill or amount is asked for.
 */
function CreateLrFollowup() {
  const router = useRouter();
  const { distributors } = useDistributors();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // One key per form: a double click or a retried request makes one follow-up.
  const [requestKey] = useState(newRequestKey);

  const suppliers = useMemo(
    () =>
      (distributors || [])
        .filter((d) => d.HQ_DIST_CODE != null)
        .map((d) => ({ id: d.HQ_DIST_CODE, value: d.MDM_DIST_NAME || String(d.HQ_DIST_CODE) })),
    [distributors]
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const { errors: found, payload } = validateManualFollowup(form, localToday());
    setErrors(found);
    if (!payload) {
      toast.error(Object.values(found)[0]);
      return;
    }
    setBusy(true);
    try {
      const created = unwrap(await createManualFollowup({ ...payload, request_key: requestKey }));
      toast.success(`LR Follow-up ${followupRef(created)} created`);
      router.push(`/lr-followup/${created.lr_followup_id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlobalWrapper title="Create LR Follow-up" permissionKey={["create_credit_purchase"]}>
      <CustomContainer title="Create LR Follow-up" filledHeader>
        <Text fontSize="sm" color="gray.600" mb="14px">
          For goods dispatched by a supplier to the Warehouse. The follow-up stays open until the goods are
          physically received. Entering an LR No. or Dispatch Date marks it In Transit.
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="14px">
          <Field label="Supplier" isRequired error={errors.distributor_code}>
            <SearchableDropdown
              options={suppliers}
              value={form.distributor_code}
              onChange={(id) => set({ distributor_code: id || null })}
              placeholder="Select supplier"
            />
          </Field>
          <TransporterSelect
            isRequired
            value={form.transporter_id}
            onChange={(id) => set({ transporter_id: id })}
            error={errors.transporter_id}
          />
          <Field label="LR No." error={errors.lr_no}>
            <Input size="sm" maxLength={100} value={form.lr_no} onChange={(e) => set({ lr_no: e.target.value })} />
          </Field>
          <Field label="Dispatch Date" error={errors.dispatch_date}>
            <Input size="sm" type="date" max={localToday()} value={form.dispatch_date} onChange={(e) => set({ dispatch_date: e.target.value })} />
          </Field>
          <Field label="Expected Delivery Date" error={errors.expected_delivery_date}>
            <Input
              size="sm"
              type="date"
              value={form.expected_delivery_date}
              onChange={(e) => set({ expected_delivery_date: e.target.value })}
            />
          </Field>
          <Field label="Remarks">
            <Textarea size="sm" maxLength={500} value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} />
          </Field>
        </Grid>
        <Flex justify="flex-end" gap="10px" mt="20px">
          <Button variant="ghost" onClick={() => router.push("/lr-followup")} isDisabled={busy}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={save} isLoading={busy}>
            Create LR Follow-up
          </Button>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

function Field({ label, isRequired, error, children }) {
  return (
    <FormControl isRequired={isRequired} isInvalid={Boolean(error)}>
      <FormLabel fontSize="sm" mb="4px">
        {label}
      </FormLabel>
      {children}
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
}

export default CreateLrFollowup;
