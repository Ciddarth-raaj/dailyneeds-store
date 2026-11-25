import React from "react";
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from "@chakra-ui/react";

/**
 * The All GRN page's "Search GRN No" box. Controlled: the page owns the value
 * and decides when to search (debounced while typing, at once on Enter).
 */
function GrnSearchBar({ value, onChange, onSubmit, onClear }) {
  const hasValue = Boolean(value);
  return (
    <InputGroup size="lg" maxW="480px">
      <InputLeftElement pointerEvents="none" color="gray.400">
        <i className="fa fa-search" />
      </InputLeftElement>
      <Input
        type="search"
        inputMode="search"
        placeholder="Search GRN No"
        aria-label="Search GRN No"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          } else if (e.key === "Escape" && hasValue) {
            e.preventDefault();
            onClear();
          }
        }}
        bg="white"
        autoComplete="off"
        // The browser's own clear control would duplicate the × below.
        sx={{ "&::-webkit-search-cancel-button": { display: "none" } }}
      />
      {hasValue ? (
        <InputRightElement>
          <IconButton
            aria-label="Clear GRN search"
            icon={<span aria-hidden="true">×</span>}
            size="sm"
            variant="ghost"
            fontSize="xl"
            onClick={onClear}
          />
        </InputRightElement>
      ) : null}
    </InputGroup>
  );
}

export default GrnSearchBar;
