import React, { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";

/**
 * Payroll Reports - the template control.
 *
 * A template is a STRUCTURE (report type, columns, order, display
 * preferences, reusable filters) and never payroll values, so it applies to
 * any month: a template made in September shows October's data when applied
 * to October.
 *
 * Built-in and other people's shared templates are read-only; Duplicate is
 * the way to make one your own. The server enforces the same rules - the
 * `permissions` on each template only decide which menu items are offered.
 */
function PayrollTemplateBar({
  templates,
  selectedId,
  onSelect,
  onApply,
  onSaveNew,
  onUpdate,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  canShare,
  busy,
}) {
  const [dialog, setDialog] = useState(null); // { kind, template }
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);

  const current = (templates || []).find((t) => t.template_id === Number(selectedId)) || null;
  const can = (verb) => Boolean(current && current.permissions && current.permissions[verb]);

  const open = (kind, template = current) => {
    setName(
      kind === "rename" ? template.template_name : kind === "duplicate" ? `${template.template_name} (copy)` : ""
    );
    setShared(false);
    setMakeDefault(false);
    setDialog({ kind, template });
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (dialog.kind !== "delete" && !trimmed) return;
    if (dialog.kind === "new") await onSaveNew(trimmed, { shared, makeDefault });
    if (dialog.kind === "rename") await onRename(dialog.template, trimmed);
    if (dialog.kind === "duplicate") await onDuplicate(dialog.template, trimmed);
    if (dialog.kind === "delete") await onDelete(dialog.template);
    setDialog(null);
  };

  const TITLE = { new: "Save as New Template", rename: "Rename Template", duplicate: "Duplicate Template", delete: "Delete Template" };

  return (
    <>
      <HStack spacing="8px">
        <Select
          size="sm"
          minW="220px"
          placeholder="Template..."
          value={selectedId || ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          aria-label="Template"
        >
          {(templates || []).map((t) => (
            <option key={t.template_id} value={t.template_id}>
              {t.template_name}
              {t.is_system ? " (built-in)" : t.is_shared ? " (shared)" : ""}
              {t.is_default ? " - default" : ""}
            </option>
          ))}
        </Select>
        <Button size="sm" onClick={() => current && onApply(current)} isDisabled={!current || busy}>
          Apply Template
        </Button>
        <Menu placement="bottom-end">
          <MenuButton as={Button} size="sm" variant="outline" isDisabled={busy} aria-label="Template actions">
            <i className="fa fa-ellipsis-h" />
          </MenuButton>
          <MenuList fontSize="sm">
            <MenuItem onClick={() => open("new")}>Save as New Template</MenuItem>
            <MenuItem isDisabled={!can("canEdit")} onClick={() => onUpdate(current)}>
              Update Template
            </MenuItem>
            <MenuItem isDisabled={!can("canEdit")} onClick={() => open("rename")}>
              Rename Template
            </MenuItem>
            <MenuItem isDisabled={!can("canCopy")} onClick={() => open("duplicate")}>
              Duplicate Template
            </MenuItem>
            <MenuItem isDisabled={!can("canDelete")} onClick={() => open("delete")} color="red.600">
              Delete Template
            </MenuItem>
            <MenuDivider />
            {current && current.is_default ? (
              <MenuItem onClick={() => onSetDefault(null)}>Clear Default</MenuItem>
            ) : (
              <MenuItem isDisabled={!current} onClick={() => onSetDefault(current)}>
                Set as Default
              </MenuItem>
            )}
          </MenuList>
        </Menu>
        {current && current.is_default ? (
          <Badge colorScheme="purple" fontSize="10px">
            Default
          </Badge>
        ) : null}
      </HStack>

      <Modal isOpen={Boolean(dialog)} onClose={() => setDialog(null)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{dialog ? TITLE[dialog.kind] : ""}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {dialog && dialog.kind === "delete" ? (
              <Text fontSize="sm">
                Delete the template <b>{dialog.template.template_name}</b>? Saved month layouts are not affected.
              </Text>
            ) : (
              <Stack spacing="10px">
                <Input
                  size="sm"
                  autoFocus
                  placeholder="Template name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Template name"
                />
                {dialog && dialog.kind === "new" ? (
                  <>
                    <Text fontSize="xs" color="gray.600">
                      Saves the current columns, their order, display options and the outlet / pay type filters. No
                      payroll values are stored, so the template works for any month.
                    </Text>
                    {canShare ? (
                      <Checkbox size="sm" isChecked={shared} onChange={(e) => setShared(e.target.checked)}>
                        Share with other users
                      </Checkbox>
                    ) : null}
                    <Checkbox size="sm" isChecked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)}>
                      Set as my default for this report
                    </Checkbox>
                  </>
                ) : null}
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="ghost" marginRight="8px" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme={dialog && dialog.kind === "delete" ? "red" : "purple"}
              isLoading={busy}
              isDisabled={dialog && dialog.kind !== "delete" && !name.trim()}
              onClick={submit}
            >
              {dialog && dialog.kind === "delete" ? "Delete" : "Save"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default PayrollTemplateBar;
