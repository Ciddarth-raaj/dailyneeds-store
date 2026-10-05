import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import CustomContainer from "../../components/CustomContainer";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CompanyHelper from "../../helper/company";
import { GROUPS, PERMISSION, emptyForm, formOf, validateCompanyForm } from "../../util/companyDetails";

/**
 * Master → Company Details.
 *
 * The company every payslip is issued by. Exactly one company may be Active
 * for Payslip; marking one active clears it on every other. Payslip Publish
 * reads the active company and FREEZES it into each payslip, so editing here
 * changes payslips published from now on and never one already published.
 *
 * Behind `manage_company_details` - administrators, and any designation it is
 * deliberately granted to. The server refuses every /company call without it.
 */
const PERMISSION_KEY = [PERMISSION];

function CompanyForm({ initial, saving, onSave, onCancel }) {
  const [form, setForm] = useState(() => formOf(initial));
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    const { values, errors: found } = validateCompanyForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(values, setErrors);
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack spacing={6}>
        {GROUPS.map((group) => (
          <Box key={group.title}>
            <Heading size="sm" mb={3}>
              {group.title}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {group.fields.map((f) => (
                <FormControl
                  key={f.key}
                  isRequired={f.required}
                  isInvalid={Boolean(errors[f.key])}
                  gridColumn={f.multiline ? { md: "span 2" } : undefined}
                >
                  <FormLabel fontSize="sm">{f.label}</FormLabel>
                  {f.multiline ? (
                    <Textarea
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      maxLength={f.max}
                      rows={3}
                    />
                  ) : (
                    <Input
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      maxLength={f.max || 45}
                      textTransform={f.upper ? "uppercase" : undefined}
                    />
                  )}
                  {errors[f.key] ? (
                    <FormErrorMessage>{errors[f.key]}</FormErrorMessage>
                  ) : f.help ? (
                    <FormHelperText>{f.help}</FormHelperText>
                  ) : null}
                </FormControl>
              ))}
            </SimpleGrid>
          </Box>
        ))}

        <Box>
          <Heading size="sm" mb={3}>
            Payslip
          </Heading>
          <Checkbox isChecked={form.payslip_active} onChange={(e) => set("payslip_active", e.target.checked)}>
            Active for Payslip
          </Checkbox>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Payslips are published under this company. Only one company can be active; marking this one clears
            any other. Payslips already published keep the company details they were published with.
          </Text>
        </Box>

        <HStack spacing={3}>
          <Button type="submit" colorScheme="purple" isLoading={saving}>
            Save
          </Button>
          {onCancel ? (
            <Button variant="outline" onClick={onCancel} isDisabled={saving}>
              Cancel
            </Button>
          ) : null}
        </HStack>
      </Stack>
    </form>
  );
}

function CompanyCard({ company, onEdit, onMakePayslipCompany, busy }) {
  const line = (label, value) =>
    value ? (
      <Text fontSize="sm">
        <Text as="span" color="gray.600">
          {label}:{" "}
        </Text>
        {value}
      </Text>
    ) : null;
  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justifyContent="space-between" alignItems="flex-start" gap={3} flexWrap="wrap">
        <Box minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Heading size="sm">{company.company_name}</Heading>
            {company.payslip_active ? <Badge colorScheme="green">Payslip Company</Badge> : null}
          </HStack>
          <Text fontSize="sm" whiteSpace="pre-line" mt={1}>
            {company.reg_address}
          </Text>
          {line("Phone", company.contact_number)}
          {line("PF Establishment Code", company.pf_number)}
          {line("ESI Establishment Code", company.esi_number)}
          {line("GSTIN", company.gst_number)}
          {line("PAN", company.pan_number)}
          {line("TAN", company.tan_number)}
        </Box>
        <HStack spacing={2}>
          {!company.payslip_active ? (
            <Button size="sm" variant="outline" colorScheme="green" onClick={onMakePayslipCompany} isDisabled={busy}>
              Use for Payslips
            </Button>
          ) : null}
          <Button size="sm" colorScheme="purple" variant="outline" onClick={onEdit} isDisabled={busy}>
            Edit
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

function CompanyDetails() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  /* null: list; "new": the create form; a company: its edit form. */
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    CompanyHelper.list()
      .then((res) => {
        if (res && res.code === 200) setData(res);
        else setLoadError((res && res.msg) || "Could not load Company Details");
      })
      .catch(() => setLoadError("Could not load Company Details"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companies = (data && data.companies) || [];
  const payslip = data && data.payslip;
  const formOpen = editing !== null || (data && companies.length === 0);

  const save = (values, setErrors) => {
    setSaving(true);
    const isNew = editing === null || editing === "new";
    const call = isNew ? CompanyHelper.create(values) : CompanyHelper.update(editing.company_id, values);
    call
      .then((res) => {
        if (res && res.code === 200) {
          toast.success(isNew ? "Company added" : "Company Details saved");
          setEditing(null);
          load();
          return;
        }
        if (res && Array.isArray(res.errors)) {
          const byField = {};
          res.errors.forEach((e) => {
            byField[e.field] = e.message;
          });
          setErrors(byField);
        }
        toast.error((res && res.msg) || "Could not save Company Details");
      })
      .catch(() => toast.error("Could not save Company Details"))
      .finally(() => setSaving(false));
  };

  const makePayslipCompany = (company) => {
    setSaving(true);
    CompanyHelper.setPayslipCompany(company.company_id)
      .then((res) => {
        if (res && res.code === 200) {
          toast.success(`${company.company_name} is now the payslip company`);
          load();
        } else toast.error((res && res.msg) || "Could not change the payslip company");
      })
      .catch(() => toast.error("Could not change the payslip company"))
      .finally(() => setSaving(false));
  };

  return (
    <GlobalWrapper title="Company Details" permissionKey={PERMISSION_KEY}>
      <CustomContainer
        title="Company Details"
        filledHeader
        rightSection={
          <HStack spacing={2}>
            {!formOpen ? (
              <Button size="sm" colorScheme="purple" variant="outline" onClick={() => setEditing("new")}>
                Add Company
              </Button>
            ) : null}
            <Button size="sm" colorScheme="purple" onClick={load} isDisabled={saving}>
              Refresh
            </Button>
          </HStack>
        }
      >
        {loading && !data ? (
          <Flex justifyContent="center" py={8}>
            <Spinner />
          </Flex>
        ) : loadError ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : (
          <Stack spacing={5}>
            {payslip && payslip.configured ? (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  <b>Payslip Company:</b> {payslip.company.name}
                  {payslip.company.source === "env" ? " (set by the server's PAYSLIP_COMPANY_NAME override)" : ""}
                </AlertDescription>
              </Alert>
            ) : payslip ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  {payslip.message}
                  {payslip.reason === "MULTIPLE"
                    ? " Use “Use for Payslips” on the company payslips should be issued by."
                    : " Add the company below and tick Active for Payslip."}
                </AlertDescription>
              </Alert>
            ) : null}

            {formOpen ? (
              <Box borderWidth="1px" borderRadius="md" p={{ base: 3, md: 5 }}>
                <Heading size="sm" mb={4}>
                  {editing && editing !== "new" ? `Edit ${editing.company_name}` : "Add Company"}
                </Heading>
                <CompanyForm
                  key={editing && editing !== "new" ? editing.company_id : "new"}
                  initial={
                    editing && editing !== "new"
                      ? editing
                      : { ...emptyForm(), payslip_active: !(payslip && payslip.configured) }
                  }
                  saving={saving}
                  onSave={save}
                  onCancel={companies.length > 0 ? () => setEditing(null) : null}
                />
              </Box>
            ) : null}

            {!formOpen
              ? companies.map((company) => (
                  <CompanyCard
                    key={company.company_id}
                    company={company}
                    busy={saving}
                    onEdit={() => setEditing(company)}
                    onMakePayslipCompany={() => makePayslipCompany(company)}
                  />
                ))
              : null}
          </Stack>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CompanyDetails;
