import React, { useState } from "react";
import {
  Button,
  Flex,
  FormControl,
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
  Text,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import TransporterSelect from "./TransporterSelect";
import usePermissions from "../../customHooks/usePermissions";
import {
  addFollowUp,
  markGoodsReceived,
  recordLegacyDecision,
  closeWithoutReceipt,
  updateLrDetails,
  unwrap,
} from "../../helper/lrFollowup";
import {
  DECISIONS,
  NON_RECEIPT_DECISIONS,
  PERMISSIONS,
  buildFollowUpPayload,
  buildLrPayload,
  dateOnly,
  isOpenStatus,
  localToday,
  newRequestKey,
} from "../../util/lrFollowup";

/**
 * The actions on one follow-up. Which buttons show follows the user's keys
 * and the follow-up's status; the server re-checks both on every call.
 *
 * Every dialog takes a fresh request key when it opens, so a double click or
 * a retried request is recorded once.
 */
function FollowupActions({ followup, onChanged, size = "sm" }) {
  const canUpdate = usePermissions([PERMISSIONS.UPDATE]);
  const canReceive = usePermissions([PERMISSIONS.MARK_RECEIVED]);
  const canManage = usePermissions([PERMISSIONS.MANAGE_LEGACY]);
  // Closing a LIVE follow-up without receipt is its own admin key.
  const canCloseWithoutReceipt = usePermissions([PERMISSIONS.CLOSE_WITHOUT_RECEIPT]);
  const [open, setOpen] = useState(null);

  if (!followup) return null;
  const live = isOpenStatus(followup.status);
  const legacy = followup.status === "VERIFICATION_REQUIRED";

  const done = (detail, message) => {
    setOpen(null);
    toast.success(message);
    if (onChanged) onChanged(detail);
  };

  return (
    <>
      <Flex gap="8px" wrap="wrap" sx={{ "& > button": { flexShrink: 0, whiteSpace: "nowrap" } }}>
        {live && canUpdate && (
          <Button size={size} colorScheme="purple" variant="outline" onClick={() => setOpen("followup")}>
            Add Follow-up
          </Button>
        )}
        {live && canUpdate && (
          <Button size={size} colorScheme="purple" variant="outline" onClick={() => setOpen("lr")}>
            Update LR / Dispatch
          </Button>
        )}
        {live && canReceive && (
          <Button size={size} colorScheme="green" onClick={() => setOpen("received")}>
            Mark Goods Received
          </Button>
        )}
        {legacy && canManage && (
          <Button size={size} colorScheme="orange" onClick={() => setOpen("verify")}>
            Record Verification
          </Button>
        )}
        {live && canCloseWithoutReceipt && (
          <Button size={size} variant="ghost" colorScheme="red" onClick={() => setOpen("close")}>
            Close without receipt
          </Button>
        )}
      </Flex>

      {open === "lr" && <LrDialog followup={followup} onClose={() => setOpen(null)} onDone={done} />}
      {open === "followup" && <FollowUpDialog followup={followup} onClose={() => setOpen(null)} onDone={done} />}
      {open === "received" && <ReceivedDialog followup={followup} onClose={() => setOpen(null)} onDone={done} />}
      {(open === "verify" || open === "close") && (
        <DecisionDialog
          followup={followup}
          mode={open}
          options={open === "verify" ? DECISIONS : NON_RECEIPT_DECISIONS}
          title={open === "verify" ? "Legacy Follow-up Verification" : "Close without receipt"}
          onClose={() => setOpen(null)}
          onDone={done}
        />
      )}
    </>
  );
}

/** Runs a call, unwraps it, and reports a refusal in the server's words. */
async function submit(setBusy, call, onSuccess) {
  setBusy(true);
  try {
    onSuccess(unwrap(await call()));
  } catch (err) {
    toast.error(err.message || "Could not save");
  } finally {
    setBusy(false);
  }
}

function Dialog({ title, children, onClose, onSave, busy, saveLabel = "Save", colorScheme = "purple" }) {
  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap="12px">
            {children}
          </Flex>
        </ModalBody>
        <ModalFooter gap="8px">
          <Button variant="ghost" onClick={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button colorScheme={colorScheme} onClick={onSave} isLoading={busy}>
            {saveLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function Field({ label, children, isRequired }) {
  return (
    <FormControl isRequired={isRequired}>
      <FormLabel fontSize="sm" mb="4px">
        {label}
      </FormLabel>
      {children}
    </FormControl>
  );
}

function LrDialog({ followup, onClose, onDone }) {
  const [requestKey] = useState(newRequestKey);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    lr_no: followup.lr_no || "",
    transporter_id: followup.transporter_id || null,
    dispatch_date: dateOnly(followup.dispatch_date),
    expected_delivery_date: dateOnly(followup.expected_delivery_date),
    remark: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    const payload = buildLrPayload(followup, form, requestKey);
    if (!payload) {
      toast.error("Nothing has changed.");
      return;
    }
    submit(setBusy, () => updateLrDetails(followup.lr_followup_id, payload), (d) => onDone(d, "LR details updated"));
  };

  return (
    <Dialog title="Update LR / Dispatch" onClose={onClose} onSave={save} busy={busy}>
      <Text fontSize="xs" color="gray.500">
        All fields are optional. An LR No. or a Dispatch Date moves the follow-up to In Transit. Nothing here
        closes it — only Mark Goods Received does.
      </Text>
      <Field label="LR No.">
        <Input size="sm" value={form.lr_no} onChange={(e) => set({ lr_no: e.target.value })} maxLength={100} />
      </Field>
      <TransporterSelect
        value={form.transporter_id}
        current={followup}
        onChange={(id) => set({ transporter_id: id })}
      />
      <Flex gap="12px">
        <Field label="Dispatch Date">
          <Input
            size="sm"
            type="date"
            max={localToday()}
            value={form.dispatch_date}
            onChange={(e) => set({ dispatch_date: e.target.value })}
          />
        </Field>
        <Field label="Expected Delivery Date">
          <Input
            size="sm"
            type="date"
            value={form.expected_delivery_date}
            onChange={(e) => set({ expected_delivery_date: e.target.value })}
          />
        </Field>
      </Flex>
      <Field label="Remarks">
        <Textarea size="sm" value={form.remark} onChange={(e) => set({ remark: e.target.value })} maxLength={1000} />
      </Field>
    </Dialog>
  );
}

function FollowUpDialog({ followup, onClose, onDone }) {
  const [requestKey] = useState(newRequestKey);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    remark: "",
    next_follow_up_date: "",
    expected_delivery_date: dateOnly(followup.expected_delivery_date),
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    const { payload, error } = buildFollowUpPayload(form, followup, requestKey);
    if (error) {
      toast.error(error);
      return;
    }
    submit(setBusy, () => addFollowUp(followup.lr_followup_id, payload), (d) => onDone(d, "Follow-up added"));
  };

  return (
    <Dialog title="Add Follow-up" onClose={onClose} onSave={save} busy={busy}>
      <Field label="Remark" isRequired>
        <Textarea
          size="sm"
          value={form.remark}
          onChange={(e) => set({ remark: e.target.value })}
          placeholder="e.g. Supplier contacted. Dispatch expected tonight."
          maxLength={1000}
        />
      </Field>
      <Flex gap="12px">
        <Field label="Next Follow-up Date">
          <Input
            size="sm"
            type="date"
            min={localToday()}
            value={form.next_follow_up_date}
            onChange={(e) => set({ next_follow_up_date: e.target.value })}
          />
        </Field>
        <Field label="Expected Delivery (if changed)">
          <Input
            size="sm"
            type="date"
            value={form.expected_delivery_date}
            onChange={(e) => set({ expected_delivery_date: e.target.value })}
          />
        </Field>
      </Flex>
    </Dialog>
  );
}

/** `YYYY-MM-DDTHH:mm` for a datetime-local input, in the viewer's zone. */
const localDateTime = (d = new Date()) =>
  `${dateOnly(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function ReceivedDialog({ followup, onClose, onDone }) {
  const [requestKey] = useState(newRequestKey);
  const [busy, setBusy] = useState(false);
  const [receivedAt, setReceivedAt] = useState(localDateTime());
  const [remark, setRemark] = useState("");

  const save = () =>
    submit(
      setBusy,
      () =>
        markGoodsReceived(followup.lr_followup_id, {
          received_at: receivedAt ? new Date(receivedAt).toISOString() : null,
          remark: remark || null,
          request_key: requestKey,
        }),
      (d) => onDone(d, "Goods received — follow-up closed")
    );

  return (
    <Dialog
      title="Mark Goods Received"
      onClose={onClose}
      onSave={save}
      busy={busy}
      saveLabel="Confirm Receipt"
      colorScheme="green"
    >
      <Text fontSize="sm">
        Confirm only when the goods have <b>physically arrived</b>. This records you as the receiver and closes
        the follow-up; it cannot be undone.
      </Text>
      <Field label="Received on" isRequired>
        <Input
          size="sm"
          type="datetime-local"
          max={localDateTime()}
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
        />
      </Field>
      <Field label="Remarks">
        <Textarea size="sm" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={1000} />
      </Field>
    </Dialog>
  );
}

function DecisionDialog({ followup, mode, options, title, onClose, onDone }) {
  const [requestKey] = useState(newRequestKey);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState("");
  const [remark, setRemark] = useState("");
  const [receivedOn, setReceivedOn] = useState("");

  const save = () => {
    if (!decision) {
      toast.error("Choose a decision");
      return;
    }
    if (!remark.trim()) {
      toast.error("A remark is required — it is the audit's reason");
      return;
    }
    submit(
      setBusy,
      () =>
        mode === "verify"
          ? recordLegacyDecision(followup.lr_followup_id, {
              decision,
              remark: remark.trim(),
              received_at: decision === "GOODS_RECEIVED" && receivedOn ? `${receivedOn}T12:00:00+05:30` : null,
              request_key: requestKey,
            })
          : closeWithoutReceipt(followup.lr_followup_id, {
              closure_reason: decision,
              remark: remark.trim(),
              request_key: requestKey,
            }),
      (d) => onDone(d, "Decision recorded")
    );
  };

  return (
    <Dialog
      title={title}
      onClose={onClose}
      onSave={save}
      busy={busy}
      saveLabel={mode === "verify" ? "Record Decision" : "Close Without Receipt"}
      colorScheme={mode === "verify" ? "orange" : "red"}
    >
      {mode !== "verify" && (
        <Text fontSize="sm" color="red.700" bg="red.50" p="8px" borderRadius="6px">
          This closes the follow-up <b>without stock being received</b>. It is reported separately from Goods
          Received and cannot be undone.
        </Text>
      )}
      <Text fontSize="xs" color="gray.500">
        The decision, your remark, your name and the time are kept in the follow-up history. The original Advance
        Request or Credit Purchase is not changed.
      </Text>
      <Field label={mode === "verify" ? "Decision" : "Closure Reason"} isRequired>
        <Select size="sm" placeholder="Select" value={decision} onChange={(e) => setDecision(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.value}
            </option>
          ))}
        </Select>
      </Field>
      {decision === "GOODS_RECEIVED" && (
        <Field label="Received on (if known)">
          <Input size="sm" type="date" max={localToday()} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
        </Field>
      )}
      <Field label="Remark" isRequired>
        <Textarea size="sm" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={1000} />
      </Field>
    </Dialog>
  );
}

export default FollowupActions;
