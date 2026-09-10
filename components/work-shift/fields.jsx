import React from "react";
import {
  Box,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@chakra-ui/react";

/**
 * The controls the Work Shift form is built from.
 *
 * Small and local on purpose. The HR profile has its own `EditField` in
 * components/hr/profile/SectionCard.jsx, but that one carries HR's read/edit
 * section semantics; this form is edit-only and needs two things that one
 * does not have — a dependent field that DISABLES rather than disappears, and
 * a per-field error message.
 *
 * WHY DISABLE RATHER THAN HIDE. When OT Allowed is off, its dependent fields
 * stay on screen greyed out. A field that vanishes takes with it the answer to
 * "what is this shift's OT rounding set to", and the settings still exist in
 * the row whether or not the toggle is on.
 */

/** A label, with the little "i" when the field was approved with an explanation. */
function LabelWithHint({ label, hint, isRequired }) {
  return (
    <FormLabel fontSize="xs" color="gray.600" mb={1} display="flex" alignItems="center" gap={1}>
      <span>
        {label}
        {isRequired ? (
          <Text as="span" color="red.500" ml={1}>
            *
          </Text>
        ) : null}
      </span>
      {hint ? (
        <Tooltip label={hint} hasArrow placement="top" maxW="320px">
          <Box
            as="span"
            aria-label={`${label} help`}
            tabIndex={0}
            color="gray.400"
            cursor="help"
            _hover={{ color: "purple.500" }}
          >
            <i className="fa fa-circle-info" aria-hidden="true" />
          </Box>
        </Tooltip>
      ) : null}
    </FormLabel>
  );
}

/** A whole number of minutes, or a plain text value such as HH:MM. */
export function TextField({
  label,
  name,
  value,
  onChange,
  hint,
  help,
  error,
  placeholder,
  type = "text",
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  maxLength,
  inputMode,
  size = "sm",
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isDisabled={isDisabled}>
      <LabelWithHint label={label} hint={hint} isRequired={isRequired} />
      <Input
        size={size}
        type={type}
        name={name}
        value={value ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        isReadOnly={isReadOnly}
        bg={isReadOnly ? "gray.50" : undefined}
        onChange={(e) => onChange(name, e.target.value)}
      />
      {error ? (
        <FormErrorMessage fontSize="xs">{error}</FormErrorMessage>
      ) : help ? (
        <Text fontSize="10px" color="gray.500" mt={1}>
          {help}
        </Text>
      ) : null}
    </FormControl>
  );
}

/** A whole number of minutes. Kept as text so an empty box stays empty. */
export function MinutesField(props) {
  return <TextField {...props} inputMode="numeric" placeholder={props.placeholder ?? "0"} />;
}

/** A duration typed HH:MM. The backend is sent minutes; nobody types minutes. */
export function HoursMinutesField(props) {
  return (
    <TextField
      {...props}
      placeholder={props.placeholder ?? "HH:MM"}
      help={props.help ?? "HH:MM"}
    />
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  hint,
  help,
  error,
  isDisabled = false,
  size = "sm",
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isDisabled={isDisabled}>
      <LabelWithHint label={label} hint={hint} />
      <Select
        size={size}
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {error ? (
        <FormErrorMessage fontSize="xs">{error}</FormErrorMessage>
      ) : help ? (
        <Text fontSize="10px" color="gray.500" mt={1}>
          {help}
        </Text>
      ) : null}
    </FormControl>
  );
}

/** A switch that reads as a sentence, with room for the explanation beneath. */
export function ToggleField({
  label,
  name,
  value,
  onChange,
  hint,
  help,
  isDisabled = false,
}) {
  return (
    <FormControl isDisabled={isDisabled}>
      <Stack direction="row" align="center" spacing={3}>
        <Switch
          size="sm"
          colorScheme="purple"
          name={name}
          isChecked={Boolean(value)}
          isDisabled={isDisabled}
          onChange={(e) => onChange(name, e.target.checked)}
        />
        <Box>
          <Stack direction="row" align="center" spacing={1}>
            <Text fontSize="sm" color={isDisabled ? "gray.400" : "gray.700"}>
              {label}
            </Text>
            {hint ? (
              <Tooltip label={hint} hasArrow placement="top" maxW="320px">
                <Box
                  as="span"
                  aria-label={`${label} help`}
                  tabIndex={0}
                  color="gray.400"
                  cursor="help"
                  _hover={{ color: "purple.500" }}
                >
                  <i className="fa fa-circle-info" aria-hidden="true" />
                </Box>
              </Tooltip>
            ) : null}
          </Stack>
          {help ? (
            <Text fontSize="10px" color="gray.500">
              {help}
            </Text>
          ) : null}
        </Box>
      </Stack>
    </FormControl>
  );
}

/** A named group of settings inside a tab. */
export function FieldGroup({ title, description, children }) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="bold" color="gray.700">
        {title}
      </Text>
      {description ? (
        <Text fontSize="xs" color="gray.500" mb={2}>
          {description}
        </Text>
      ) : (
        <Box mb={2} />
      )}
      {children}
    </Box>
  );
}

export function FieldGrid({ children, columns = { base: 1, md: 2, xl: 3 } }) {
  return (
    <SimpleGrid columns={columns} spacingX={5} spacingY={3}>
      {children}
    </SimpleGrid>
  );
}

export default TextField;
