import React, { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Spacer,
  Text,
} from "@chakra-ui/react";
import FieldPicker from "./FieldPicker";

/**
 * Reports — Customize Columns.
 *
 * WHY A DRAWER. The column builder was on the page, permanently, above the
 * results. Choosing columns is something you do occasionally; reading the
 * report is what you do the rest of the time, and the builder was taking the
 * top third of the screen to support the rarer job. It moves out of the way.
 *
 * IT WRAPS THE PICKER, IT DOES NOT REPLACE IT. `FieldPicker` remains the only
 * column chooser in the application - the same component, the same ordering,
 * the same cap - so the create screen and an open report cannot drift into
 * behaving differently. This file adds only the container: a title, a footer,
 * and the draft.
 *
 * ============================================== NOTHING APPLIES UNTIL APPLY ==
 *
 * Edits go to a DRAFT held here. Cancel discards it, Apply hands it up, and
 * the drawer is reopened from the live selection each time. That matters more
 * than it looks: applying per tick would re-run the query on every checkbox,
 * and a report of thirty thousand employees would spend the afternoon
 * refetching while somebody assembles a column list.
 */
function ColumnsDrawer({
  isOpen,
  onClose,
  groups,
  selected,
  maxFields,
  onApply,
  /** The template's own columns, for Reset to Default. Absent hides the button. */
  defaultSelected,
}) {
  const [draft, setDraft] = useState(selected || []);

  // Reopening starts from what is actually applied, so a cancelled edit is
  // genuinely gone rather than lying in wait.
  useEffect(() => {
    if (isOpen) setDraft(Array.isArray(selected) ? selected : []);
  }, [isOpen, selected]);

  const canReset = Array.isArray(defaultSelected) && defaultSelected.length > 0;

  return (
    <Drawer isOpen={isOpen} placement="right" size="lg" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader paddingBottom="4px">
          <Text fontSize="18px">Customize Columns</Text>
          <Text fontSize="12px" color="gray.600" fontWeight="normal">
            Select columns to display and filter in this report.
          </Text>
        </DrawerHeader>

        <DrawerBody>
          <FieldPicker
            groups={groups}
            selected={draft}
            onChange={setDraft}
            maxFields={maxFields}
          />
          <Text fontSize="11px" color="gray.500" marginTop="12px">
            Selected columns are also available as filters.
          </Text>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          {canReset && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft(defaultSelected)}
              // Restores the report's OWN defaults - the saved template's
              // columns - not a global default, which would silently turn one
              // report into another.
            >
              Reset to Default
            </Button>
          )}
          <Spacer />
          <HStack spacing="8px">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme="purple"
              isDisabled={draft.length === 0}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Apply
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default ColumnsDrawer;
