import React from "react";
import { Badge, Box, Button, Stack } from "@chakra-ui/react";

/**
 * THE WORKFLOW TABS, one strip, used by all three payrun stages.
 *
 * WHY TABS AND NOT A FILTER BAR. A month end is exception work: ten employees
 * out of three hundred need something. A row of selects makes somebody
 * assemble the question "who still needs attendance closing" out of three
 * dropdowns; a tab IS that question, already asked, with the answer's size
 * printed on it.
 *
 * THE COUNT IS THE SERVER'S AND COVERS THE WHOLE MONTH, never the filtered
 * view - see `util/payrunTabs.js`. A tab with no count shows no number rather
 * than "(0)", because "(0)" says there is nothing to do and saying that when
 * nobody counted is worse than saying nothing.
 *
 * IT SCROLLS SIDEWAYS ON A PHONE rather than wrapping into three rows or
 * collapsing into a select. Five short labels in one swipeable strip stay
 * recognisable at the size somebody actually holds; a select would hide the
 * counts, which are the reason to look.
 */
function PayrunTabs({ tabs, active, counts, onChange, isDisabled = false, ariaLabel = "Workflow" }) {
  return (
    <Box
      overflowX="auto"
      pb={1}
      sx={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}
      role="tablist"
      aria-label={ariaLabel}
    >
      <Stack direction="row" spacing={2} minWidth="max-content">
        {(tabs || []).map((tab) => {
          const count = counts ? counts(tab.key) : undefined;
          const selected = active === tab.key;
          return (
            <Button
              key={tab.key}
              role="tab"
              aria-selected={selected}
              size="sm"
              variant={selected ? "solid" : "outline"}
              colorScheme={selected ? "purple" : "gray"}
              onClick={() => onChange(tab.key)}
              isDisabled={isDisabled}
              whiteSpace="nowrap"
              flexShrink={0}
            >
              {tab.label}
              {typeof count === "number" ? (
                <Badge
                  ml={2}
                  colorScheme={selected ? "purple" : "gray"}
                  variant={selected ? "solid" : "subtle"}
                >
                  {count}
                </Badge>
              ) : null}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
}

export default PayrunTabs;
