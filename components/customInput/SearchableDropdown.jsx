import React, { useState, useRef, useEffect } from "react";
import {
  Input,
  Box,
  List,
  ListItem,
  useOutsideClick,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

/**
 * A dropdown that allows searching/filtering within options.
 * @param {Object} props
 * @param {string} [props.label] - Label text
 * @param {Array<{ id: string|number, value: string }>} props.options - Options list
 * @param {string|number} [props.value] - Selected option id
 * @param {function} [props.onChange] - (id) => void when selection changes
 * @param {string} [props.placeholder] - Placeholder when nothing selected
 * @param {boolean} [props.isDisabled] - Disable the control
 * @param {string} [props.size] - Chakra size (sm, md, lg)
 * @param {string} [props.name] - Input name (for Formik)
 */
function SearchableDropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Search or select...",
  isDisabled = false,
  size = "sm",
  name,
  ...rest
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useOutsideClick({
    ref: containerRef,
    handler: () => setIsOpen(false),
  });

  const selectedOption = options.find(
    (opt) => String(opt.id) === String(value)
  );
  const displayText = selectedOption ? selectedOption.value : "";

  const filteredOptions = search.trim()
    ? options.filter((opt) =>
        String(opt.value || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : options;

  const handleSelect = (id) => {
    onChange?.(id);
    setSearch("");
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  return (
    <FormControl isDisabled={isDisabled} {...rest}>
      {label && (
        <FormLabel fontSize="sm" fontWeight={600} color="gray.600" letterSpacing="0.01em" mb={1.5}>
          {label}
        </FormLabel>
      )}
      <Box ref={containerRef} position="relative" width="100%">
        <Input
          name={name}
          size={size}
          height="40px"
          borderRadius="6px"
          fontSize="sm"
          bg="white"
          value={isOpen ? search : displayText}
          onChange={(e) => {
            const v = e.target.value;
            if (isOpen) {
              setSearch(v);
            } else {
              setIsOpen(true);
              setSearch(v);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          isDisabled={isDisabled}
          autoComplete="off"
          focusBorderColor="purple.400"
          _disabled={{ opacity: 0.8, cursor: "not-allowed" }}
        />
        {isOpen && filteredOptions.length > 0 && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            zIndex={10}
            mt={1}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="6px"
            boxShadow="md"
            maxH="240px"
            overflowY="auto"
          >
            <List spacing={0} py={1}>
              {filteredOptions.map((opt) => (
                <ListItem
                  key={opt.id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: "purple.50" }}
                  _active={{ bg: "purple.100" }}
                  onClick={() => handleSelect(opt.id)}
                  fontSize="sm"
                  borderBottomWidth="1px"
                  borderColor="gray.50"
                  _last={{ borderBottomWidth: 0 }}
                >
                  {opt.value}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {isOpen && filteredOptions.length === 0 && search.trim() && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            zIndex={10}
            mt={1}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="6px"
            boxShadow="md"
            px={3}
            py={3}
            fontSize="sm"
            color="gray.500"
          >
            No matches
          </Box>
        )}
      </Box>
    </FormControl>
  );
}

export default SearchableDropdown;
