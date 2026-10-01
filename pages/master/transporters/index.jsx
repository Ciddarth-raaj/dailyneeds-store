import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { Menu, MenuItem } from "@szhsin/react-menu";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import EmptyData from "../../../components/EmptyData";
import Table from "../../../components/table/table";
import usePermissions from "../../../customHooks/usePermissions";
import {
  createTransporter,
  getTransporter,
  getTransporters,
  unwrap,
  updateTransporter,
} from "../../../helper/lrFollowup";
import { PERMISSIONS, formatDateTime } from "../../../util/lrFollowup";

const HEADINGS = {
  name: "Transporter Name",
  contact: "Contact No.",
  alternate: "Alternate Contact No.",
  person: "Contact Person",
  status: "Status",
  remarks: "Remarks",
  updated: "Last Updated",
  action: "Action",
};

/**
 * Transporter Master - the one list both the Advance and the Credit Purchase
 * follow-ups pick from. Transporters are never deleted: one no longer used
 * is made Inactive, which keeps it on every old record and takes it out of
 * the dropdown for new ones.
 */
function TransporterMaster() {
  const canCreate = usePermissions([PERMISSIONS.CREATE_TRANSPORTER]);
  const canEdit = usePermissions([PERMISSIONS.EDIT_TRANSPORTER]);
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // {} for new, a row for edit
  const [auditFor, setAuditFor] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setList(unwrap(await getTransporters({ is_active: active, search })));
    } catch (err) {
      setError(err.message);
    }
  }, [active, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = async (row) => {
    try {
      unwrap(await updateTransporter(row.transporter_id, { is_active: !Number(row.is_active) }));
      toast.success(Number(row.is_active) ? "Transporter made inactive" : "Transporter reactivated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const rows = useMemo(
    () =>
      (list || []).map((t) => ({
        name: t.transporter_name,
        contact: t.contact_no,
        alternate: t.alternate_contact_no || "-",
        person: t.contact_person || "-",
        status: Number(t.is_active) ? <Badge colorScheme="green">Active</Badge> : <Badge colorScheme="red">Inactive</Badge>,
        remarks: t.remarks || "-",
        updated: `${formatDateTime(t.updated_at)}${t.updated_by_name ? ` · ${t.updated_by_name}` : ""}`,
        action: (
          <Menu
            align="end"
            gap={5}
            transition
            menuButton={
              <Button size="xs" variant="outline" colorScheme="purple">
                Actions ▾
              </Button>
            }
          >
            {canEdit && <MenuItem onClick={() => setEditing(t)}>Edit</MenuItem>}
            {canEdit && (
              <MenuItem onClick={() => toggle(t)}>{Number(t.is_active) ? "Make Inactive" : "Make Active"}</MenuItem>
            )}
            <MenuItem onClick={() => setAuditFor(t.transporter_id)}>History</MenuItem>
          </Menu>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, canEdit]
  );

  return (
    <GlobalWrapper title="Transporter Master" permissionKey={["view_transporter_master"]}>
      <CustomContainer
        title="Transporter Master"
        filledHeader
        rightSection={
          <Flex gap="10px">
            <Input
              size="sm"
              bg="white"
              color="black"
              width="220px"
              placeholder="Search name, number, person"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select size="sm" bg="white" color="black" width="130px" value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            {canCreate && (
              <Button size="sm" colorScheme="purple" onClick={() => setEditing({})}>
                Add
              </Button>
            )}
          </Flex>
        }
      >
        {!list && !error && (
          <Flex justify="center" py="40px">
            <Spinner />
          </Flex>
        )}
        {error && <EmptyData message={error} />}
        {list && rows.length === 0 && <EmptyData message="No transporters found" />}
        {list && rows.length > 0 && <Table variant="plain" heading={HEADINGS} rows={rows} size="sm" showPagination />}
      </CustomContainer>

      {editing && (
        <TransporterForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {auditFor && <AuditDialog id={auditFor} onClose={() => setAuditFor(null)} />}
    </GlobalWrapper>
  );
}

function TransporterForm({ initial, onClose, onSaved }) {
  const isNew = !initial.transporter_id;
  const [form, setForm] = useState({
    transporter_name: initial.transporter_name || "",
    contact_no: initial.contact_no || "",
    alternate_contact_no: initial.alternate_contact_no || "",
    contact_person: initial.contact_person || "",
    remarks: initial.remarks || "",
    is_active: initial.transporter_id ? Boolean(Number(initial.is_active)) : true,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const found = {};
    if (!form.transporter_name.trim()) found.transporter_name = "Transporter Name is required";
    if (!form.contact_no.trim()) found.contact_no = "Contact No. is required";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const payload = { ...form };
      unwrap(isNew ? await createTransporter(payload) : await updateTransporter(initial.transporter_id, payload));
      toast.success(isNew ? "Transporter added" : "Transporter updated");
      onSaved();
    } catch (err) {
      // The server checks the number format and name duplicates; show it
      // against the field it is about.
      if (err.errors) setErrors(err.errors);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, props = {}) => (
    <FormControl isRequired={props.isRequired} isInvalid={Boolean(errors[key])}>
      <FormLabel fontSize="sm" mb="4px">
        {label}
      </FormLabel>
      {props.textarea ? (
        <Textarea size="sm" value={form[key]} maxLength={props.maxLength} onChange={(e) => set({ [key]: e.target.value })} />
      ) : (
        <Input size="sm" value={form[key]} maxLength={props.maxLength} onChange={(e) => set({ [key]: e.target.value })} />
      )}
      {errors[key] && <FormErrorMessage>{errors[key]}</FormErrorMessage>}
    </FormControl>
  );

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isNew ? "Add Transporter" : "Edit Transporter"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap="12px">
            {field("transporter_name", "Transporter Name", { isRequired: true, maxLength: 150 })}
            {field("contact_no", "Contact No.", { isRequired: true, maxLength: 20 })}
            {field("alternate_contact_no", "Alternate Contact No.", { maxLength: 20 })}
            {field("contact_person", "Contact Person", { maxLength: 100 })}
            {field("remarks", "Remarks", { textarea: true, maxLength: 500 })}
            <FormControl display="flex" alignItems="center" gap="10px">
              <Switch isChecked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} colorScheme="green" />
              <Text fontSize="sm">{form.is_active ? "Active" : "Inactive"}</Text>
            </FormControl>
            <Text fontSize="xs" color="gray.500">
              Contact numbers: a 10-digit mobile, or a landline with its STD code (e.g. 044-2345 6789).
            </Text>
          </Flex>
        </ModalBody>
        <ModalFooter gap="8px">
          <Button variant="ghost" onClick={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={save} isLoading={busy}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function AuditDialog({ id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    getTransporter(id)
      .then((b) => setData(unwrap(b)))
      .catch((err) => toast.error(err.message));
  }, [id]);

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{data ? `${data.transporter_name} — history` : "History"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!data && <Spinner />}
          {data && (
            <Flex direction="column" gap="8px">
              <Text fontSize="sm" color="gray.600">
                Used by {data.usage.credit_purchases} credit purchase(s) and {data.usage.lr_followups} LR follow-up(s).
                Created {formatDateTime(data.created_at)}
                {data.created_by_name ? ` by ${data.created_by_name}` : ""}.
              </Text>
              {(data.audit || []).map((a) => (
                <Text key={a.transporter_audit_id} fontSize="sm">
                  {formatDateTime(a.changed_at)} · {a.changed_by_name || "-"} · {a.action === "CREATE" ? "set" : "changed"}{" "}
                  <b>{a.field}</b>
                  {a.action === "UPDATE" ? ` from "${a.old_value ?? ""}"` : ""} to "{a.new_value ?? ""}"
                </Text>
              ))}
            </Flex>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TransporterMaster;
