import React from "react";
import {
  Box,
  Button,
  Stack,
  Text,
  Alert,
  AlertIcon,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Badge,
} from "@chakra-ui/react";

/**
 * Stage 0C / C3 — one section of the employee profile.
 *
 * Every section behaves the same way: read by default, Edit if the caller may
 * change it, Save and Cancel while editing, and a plain sentence instead of an
 * empty box when the caller may not see it at all. Writing that six times
 * would produce six slightly different answers to "what does Cancel do".
 *
 * A LOCKED SECTION SAYS SO. A caller without `view_employee_sensitive` gets
 * "you do not have permission to see this", never an empty section that reads
 * as "this employee has no PAN" - B3 removes the keys from the response, so a
 * blank field and a hidden one are indistinguishable from the data alone.
 */
export function SectionCard({
  title,
  subtitle,
  canView = true,
  canEdit = false,
  editing = false,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  deniedMessage = "You do not have permission to view this section.",
  badge,
  children,
  footer,
}) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={4}>
      <Stack direction="row" justify="space-between" align="flex-start" mb={3} spacing={3}>
        <Box>
          <Stack direction="row" align="center" spacing={2}>
            <Text fontWeight="bold">{title}</Text>
            {badge}
          </Stack>
          {subtitle ? (
            <Text fontSize="xs" color="gray.600">
              {subtitle}
            </Text>
          ) : null}
        </Box>

        {canView && canEdit ? (
          editing ? (
            <Stack direction="row" spacing={2}>
              <Button size="xs" variant="ghost" onClick={onCancel} isDisabled={saving}>
                Cancel
              </Button>
              <Button size="xs" colorScheme="purple" onClick={onSave} isLoading={saving}>
                Save
              </Button>
            </Stack>
          ) : (
            <Button size="xs" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )
        ) : null}
      </Stack>

      {!canView ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          {deniedMessage}
        </Alert>
      ) : (
        <>
          {children}
          {footer}
        </>
      )}
    </Box>
  );
}

/** A read-only label/value pair. "not recorded" beats an empty cell. */
export function Field({ label, value, mono = false }) {
  const empty = value === undefined || value === null || String(value).trim() === "";
  return (
    <Box minW="0">
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
        {label}
      </Text>
      <Text
        fontSize="sm"
        color={empty ? "gray.400" : "gray.800"}
        fontFamily={mono && !empty ? "mono" : undefined}
        wordBreak="break-word"
      >
        {empty ? "not recorded" : value}
      </Text>
    </Box>
  );
}

/** An editable field. `type` picks the control; options make it a dropdown. */
export function EditField({
  label,
  name,
  value,
  onChange,
  type = "text",
  options,
  help,
  isDisabled,
  /** Shown but not typed into - a value this form derives rather than accepts. */
  isReadOnly,
  onBlur,
}) {
  const set = (e) => onChange(name, e.target.value);
  const blur = onBlur ? () => onBlur(name) : undefined;
  return (
    <FormControl>
      <FormLabel fontSize="xs" color="gray.600" mb={1}>
        {label}
      </FormLabel>
      {options ? (
        <Select size="sm" value={value ?? ""} onChange={set} placeholder="—" isDisabled={isDisabled}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : type === "textarea" ? (
        <Textarea size="sm" rows={2} value={value ?? ""} onChange={set} isDisabled={isDisabled} />
      ) : (
        <Input
          size="sm"
          type={type}
          value={value ?? ""}
          onChange={set}
          onBlur={blur}
          isDisabled={isDisabled}
          isReadOnly={isReadOnly}
          // Read-only rather than disabled: the value still matters and is
          // still readable and selectable, it simply is not typed here.
          bg={isReadOnly ? "gray.50" : undefined}
        />
      )}
      {help ? (
        <Text fontSize="10px" color="gray.500" mt={1}>
          {help}
        </Text>
      ) : null}
    </FormControl>
  );
}

/** The two-column grid every section reads and edits in. */
export function FieldGrid({ children, columns = { base: 1, md: 2 } }) {
  return (
    <SimpleGrid columns={columns} spacingX={5} spacingY={3}>
      {children}
    </SimpleGrid>
  );
}

/** Marks a section whose contents B3 treats as sensitive. */
export const SensitiveBadge = () => (
  <Badge colorScheme="orange" variant="subtle" fontSize="9px">
    Sensitive
  </Badge>
);

export default SectionCard;
