import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import useOutlets from "../../customHooks/useOutlets";
import useDesignations from "../../customHooks/useDesignations";
import useDepartments from "../../customHooks/useDepartments";
import {
  MAPPING_TYPE,
  MAPPING_TYPES,
  MAPPING_MESSAGES,
  TARGET_SELECTOR,
  canSubmitMapping,
  mappingPayload,
  mappingTypeLabel,
  needsTarget,
} from "../../util/telegramGroupMapping";

/**
 * Add Mapping - one rule about who should belong to a Telegram group.
 *
 * EXACTLY FOUR CHOICES AND NO FREE TEXT. All Employees, Outlet, Designation,
 * Department. There is no rule expression to write and no employee to pick
 * by hand, so the only mistake this form can make is choosing the wrong item
 * from a list - which the matched count on the row behind it will show
 * immediately.
 *
 * NOBODY TYPES AN ID. Every target is chosen from the master list it belongs
 * to, so an id that does not exist cannot be submitted; the server checks
 * again anyway, because a screen is not an authorization boundary.
 *
 * ALL EMPLOYEES HAS NO SECOND FIELD, and the payload carries no target at
 * all - the sentinel is the server's to assign.
 *
 * THE SERVER'S REFUSAL IS SHOWN VERBATIM. "That mapping is already on this
 * group" and "That outlet no longer exists" are the sentences somebody has
 * to act on; replacing either with "Could not add mapping" would throw away
 * the only useful part.
 */
export default function AddTelegramGroupMapping({ isOpen, onClose, onSubmit, submitting }) {
  const [mappingType, setMappingType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState(null);

  // The existing master hooks, not new endpoints of our own.
  const { outlets, accessDenied: outletsDenied } = useOutlets({ directory: true });
  const { designations, accessDenied: designationsDenied } = useDesignations();
  const { departments, accessDenied: departmentsDenied } = useDepartments();

  const selector = TARGET_SELECTOR[mappingType] || null;

  const targets = useMemo(() => {
    switch (mappingType) {
      case MAPPING_TYPE.OUTLET:
        return (outlets || []).map((o) => ({ id: o.outlet_id, name: o.outlet_name }));
      case MAPPING_TYPE.DESIGNATION:
        return (designations || []).map((d) => ({ id: d.designation_id, name: d.designation_name }));
      case MAPPING_TYPE.DEPARTMENT:
        return (departments || []).map((d) => ({ id: d.department_id, name: d.department_name }));
      default:
        return [];
    }
  }, [mappingType, outlets, designations, departments]);

  const targetsDenied =
    (mappingType === MAPPING_TYPE.OUTLET && outletsDenied) ||
    (mappingType === MAPPING_TYPE.DESIGNATION && designationsDenied) ||
    (mappingType === MAPPING_TYPE.DEPARTMENT && departmentsDenied);

  const reset = () => {
    setMappingType("");
    setTargetId("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleTypeChange = (value) => {
    setMappingType(value);
    // Changing the type abandons the previous target rather than carrying a
    // designation id across into an outlet field, where it would point at a
    // different row entirely.
    setTargetId("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmit(mappingPayload({ mapping_type: mappingType, target_id: targetId }));
      reset();
    } catch (err) {
      setError((err && err.message) || "Failed to add the mapping");
    }
  };

  const ready = canSubmitMapping({ mapping_type: mappingType, target_id: targetId });

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title={MAPPING_MESSAGES.ADD_TITLE}
      size="md"
      footer={
        <>
          <Button variant="ghost" mr={3} onClick={close} isDisabled={submitting}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleSubmit}
            isDisabled={!ready || submitting}
            isLoading={submitting}
          >
            Add Mapping
          </Button>
        </>
      }
    >
      <Stack spacing={4}>
        <Text fontSize="sm" color="gray.600">
          A mapping records who <b>should</b> belong to this group. Nobody is added to or removed
          from Telegram.
        </Text>

        <FormControl>
          <FormLabel>Mapping Type</FormLabel>
          <Select
            placeholder="Select mapping type"
            value={mappingType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {MAPPING_TYPES.map((type) => (
              <option key={type} value={type}>
                {mappingTypeLabel(type)}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* All Employees covers everybody, so there is nothing more to ask. */}
        {mappingType === MAPPING_TYPE.ALL_EMPLOYEES && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Every currently employed member of staff, company-wide.
            </Text>
          </Alert>
        )}

        {needsTarget(mappingType) && (
          <FormControl>
            <FormLabel>{mappingTypeLabel(mappingType)}</FormLabel>
            {targetsDenied ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  You do not have access to the {selector} list, so this mapping type cannot be
                  used.
                </Text>
              </Alert>
            ) : (
              <Select
                placeholder={`Select ${selector}`}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </Select>
            )}
          </FormControl>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box fontSize="sm">{error}</Box>
          </Alert>
        )}
      </Stack>
    </CustomModal>
  );
}
