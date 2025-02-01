export const getSelectStyles = (colorScheme = "purple") => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "white",
    borderColor: state.isFocused
      ? `var(--chakra-colors-${colorScheme}-500)`
      : "var(--chakra-colors-gray-200)",
    boxShadow: state.isFocused
      ? `0 0 0 1px var(--chakra-colors-${colorScheme}-500)`
      : provided.boxShadow,
    borderRadius: "6px",
    "&:hover": {
      borderColor: `var(--chakra-colors-${colorScheme}-500)`,
    },
    minHeight: "40px",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "6px",
    boxShadow: "var(--chakra-shadows-lg)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? `var(--chakra-colors-${colorScheme}-500)`
      : state.isFocused
      ? `var(--chakra-colors-${colorScheme}-50)`
      : "transparent",
    color: state.isSelected ? "white" : "inherit",
    cursor: "pointer",
    ":active": {
      backgroundColor: `var(--chakra-colors-${colorScheme}-600)`,
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: `var(--chakra-colors-${colorScheme}-50)`,
    borderRadius: "4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: `var(--chakra-colors-${colorScheme}-700)`,
    fontSize: "14px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: `var(--chakra-colors-${colorScheme}-500)`,
    ":hover": {
      backgroundColor: `var(--chakra-colors-${colorScheme}-100)`,
      color: `var(--chakra-colors-${colorScheme}-700)`,
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--chakra-colors-gray-400)",
  }),
  input: (provided) => ({
    ...provided,
    color: "var(--chakra-colors-gray-800)",
  }),
});
