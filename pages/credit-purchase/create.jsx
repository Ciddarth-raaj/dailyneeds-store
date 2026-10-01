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
import useOutlets from "../../customHooks/useOutlets";
import { createCreditPurchase, unwrap } from "../../helper/lrFollowup";
import { localToday, newRequestKey, validateCreditPurchase } from "../../util/lrFollowup";

const EMPTY = {
  distributor_code: null,
  bill_reference: "",
  amount: "",
  bill_date: "",
  outlet_id: null,
  transporter_id: null,
  lr_no: "",
  dispatch_date: "",
  expected_delivery_date: "",
  remarks: "",
};

/**
 * The minimal Credit Purchase entry. Saving it creates the purchase AND its
 * LR Follow-up in one step on the server - there is nothing else to do here.
 */
function CreateCreditPurchase() {
  const router = useRouter();
  const { distributors } = useDistributors();
  const { outlets } = useOutlets({ directory: true });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  // One key per form: a double click or a retried request makes one purchase.
  const [requestKey] = useState(newRequestKey);

  const suppliers = useMemo(
    () =>
      (distributors || [])
        .filter((d) => d.HQ_DIST_CODE != null)
        .map((d) => ({ id: d.HQ_DIST_CODE, value: d.MDM_DIST_NAME || String(d.HQ_DIST_CODE) })),
    [distributors]
  );
  const outletOptions = useMemo(
    () => (outlets || []).map((o) => ({ id: o.outlet_id, value: o.outlet_name })),
    [outlets]
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const { errors: found, payload } = validateCreditPurchase(form, localToday());
    setErrors(found);
    if (!payload) {
      toast.error(Object.values(found)[0]);
      return;
    }
    setBusy(true);
    try {
      const created = unwrap(await createCreditPurchase({ ...payload, request_key: requestKey }));
      toast.success(`Credit purchase CP-${created.credit_purchase_id} saved — LR follow-up opened`);
      router.push(`/credit-purchase/${created.credit_purchase_id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlobalWrapper title="Create Credit Purchase" permissionKey={["create_credit_purchase"]}>
      <CustomContainer title="Create Credit Purchase" filledHeader>
        <Text fontSize="sm" color="gray.600" mb="14px">
          Saving opens an LR Follow-up for this purchase automatically. It stays open until the goods are
          physically received.
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
          <Field label="Credit Purchase / Bill Reference" isRequired error={errors.bill_reference}>
            <Input size="sm" maxLength={100} value={form.bill_reference} onChange={(e) => set({ bill_reference: e.target.value })} />
          </Field>
          <Field label="Amount" isRequired error={errors.amount}>
            <Input size="sm" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </Field>
          <Field label="Invoice / Bill Date" isRequired error={errors.bill_date}>
            <Input size="sm" type="date" max={localToday()} value={form.bill_date} onChange={(e) => set({ bill_date: e.target.value })} />
          </Field>
          <Field label="Receiving Outlet / Location" isRequired error={errors.outlet_id}>
            <SearchableDropdown
              options={outletOptions}
              value={form.outlet_id}
              onChange={(id) => set({ outlet_id: id || null })}
              placeholder="Select outlet"
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
          <Button variant="ghost" onClick={() => router.push("/credit-purchase")} isDisabled={busy}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={save} isLoading={busy}>
            Save Credit Purchase
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

export default CreateCreditPurchase;
