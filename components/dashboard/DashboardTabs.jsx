import React, { useRef } from "react";
import { Box, Flex } from "@chakra-ui/react";

export const tabId = (key) => `dashboard-tab-${key}`;
export const panelId = (panel) => `dashboard-panel-${panel}`;

/**
 * The Dashboard's tab bar.
 *
 * WAI-ARIA TABS WITH MANUAL ACTIVATION. The arrow keys, Home and End move
 * focus along the bar; Enter or Space (or a click) opens the focused tab. A tab
 * opens its screen and that screen asks the server for its data, so focus
 * passing over Payroll on the way to My Attendance must not load Payroll -
 * which is what automatic activation would do.
 *
 * Only the permitted tabs are passed in; a tab the caller may not open is not
 * drawn at all. On a narrow screen the bar scrolls sideways rather than
 * squeezing the labels.
 */
export default function DashboardTabs({ tabs, activeKey, onSelect }) {
  const refs = useRef({});

  const focusAt = (index) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    const el = tab && refs.current[tab.key];
    if (el) el.focus();
  };

  const onKeyDown = (event, index) => {
    if (event.key === "ArrowRight") focusAt(index + 1);
    else if (event.key === "ArrowLeft") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(tabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <Box overflowX="auto" bg="white" border="1px solid" borderColor="purple.100" borderRadius="8px" p="4px">
      <Flex role="tablist" aria-label="Dashboard views" gap="4px" w="max-content" minW="100%">
        {tabs.map((tab, index) => {
          const active = tab.key === activeKey;
          return (
            <Box
              as="button"
              type="button"
              key={tab.key}
              ref={(el) => {
                refs.current[tab.key] = el;
              }}
              role="tab"
              id={tabId(tab.key)}
              aria-selected={active ? "true" : "false"}
              aria-controls={panelId(tab.panel)}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.key)}
              onKeyDown={(e) => onKeyDown(e, index)}
              px={4}
              py="7px"
              borderRadius="6px"
              fontSize="sm"
              fontWeight={active ? "600" : "500"}
              whiteSpace="nowrap"
              color={active ? "white" : "purple.700"}
              bg={active ? "purple.500" : "transparent"}
              transition="background-color 0.15s"
              _hover={{ bg: active ? "purple.500" : "purple.50" }}
              sx={{
                "&:focus": { outline: "none" },
                "&:focus-visible": {
                  boxShadow: "0 0 0 2px white, 0 0 0 4px var(--chakra-colors-purple-400)",
                },
              }}
            >
              {tab.label}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
