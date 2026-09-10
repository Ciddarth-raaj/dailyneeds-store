import React from "react";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import { FieldGrid, TextField, ToggleField } from "./fields";
import LatenessOvertimeTab from "./LatenessOvertimeTab";
import GeneralTab from "./GeneralTab";
import RegularizationTab from "./RegularizationTab";
import WeeklyScheduleTab from "./WeeklyScheduleTab";
import { SHIFT_CODE_MAX_LENGTH, SHIFT_NAME_MAX_LENGTH } from "../../util/workShiftForm";

/**
 * Add / Edit Work Shift — a full page, not a dialog.
 *
 * There are four tabs of settings and a seven-row schedule behind this form.
 * That does not fit in a modal, and putting it in one would mean scrolling a
 * scrollable thing inside another one on the first laptop it met.
 *
 * ONE FORM, ONE SAVE. The tabs are navigation, not separate records: Save
 * Work Shift sends the configuration and all seven days in a single request,
 * which the backend writes in one transaction. So a validation failure on the
 * Weekly Schedule tab has to be visible from the General tab — hence the
 * summary above the actions, which lists every problem wherever it lives.
 *
 * Both the create and the edit screen render this; the differences between
 * them are the title, the button, and whether an id exists yet.
 */
function WorkShiftForm({
  form,
  errors = {},
  rowErrors = {},
  /** The same problems, flattened and with the weekday named — see
   *  `validateWorkShiftForm`. Two days can fail the same way, so the summary
   *  reads from this rather than re-flattening `rowErrors` and losing which
   *  day each line is about. */
  messages = [],
  serverError = null,
  saving = false,
  /** False for a caller holding `view_work_shifts` but not
   *  `manage_work_shifts`: they read the configuration, and no Save is
   *  offered that the backend would refuse. */
  canSubmit = true,
  submitLabel = "Save Work Shift",
  title,
  subtitle,
  onChange,
  onRowChange,
  onCopyDay,
  onSubmit,
  cancelHref = "/work-shift",
}) {
  return (
    <Stack spacing={4}>
      <CustomContainer title={title} subtitle={subtitle} filledHeader>
        <Stack spacing={4}>
          <FieldGrid columns={{ base: 1, md: 3 }}>
            <TextField
              label="Shift Code"
              name="shift_code"
              value={form.shift_code}
              error={errors.shift_code}
              onChange={onChange}
              isRequired
              maxLength={SHIFT_CODE_MAX_LENGTH}
              placeholder="e.g. GEN-A"
            />
            <TextField
              label="Shift Name"
              name="shift_name"
              value={form.shift_name}
              error={errors.shift_name}
              onChange={onChange}
              isRequired
              maxLength={SHIFT_NAME_MAX_LENGTH}
              placeholder="e.g. General Shift A"
            />
            <Box alignSelf="center" pt={{ base: 0, md: 4 }}>
              <ToggleField
                label={form.active ? "Active" : "Inactive"}
                name="active"
                value={form.active}
                onChange={onChange}
                help="An inactive work shift is kept and can be reactivated. There is no delete."
              />
            </Box>
          </FieldGrid>

          <Divider />

          <Tabs colorScheme="purple" variant="enclosed" isLazy={false} size="sm">
            <TabList>
              <Tab>Lateness, Early Out &amp; OT</Tab>
              <Tab>General</Tab>
              <Tab>Regularization</Tab>
              <Tab>Weekly Schedule</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <LatenessOvertimeTab form={form} errors={errors} onChange={onChange} />
              </TabPanel>
              <TabPanel px={0}>
                <GeneralTab form={form} errors={errors} onChange={onChange} />
              </TabPanel>
              <TabPanel px={0}>
                <RegularizationTab form={form} errors={errors} onChange={onChange} />
              </TabPanel>
              <TabPanel px={0}>
                <WeeklyScheduleTab
                  rows={form.weekly_schedule}
                  rowErrors={rowErrors}
                  onRowChange={onRowChange}
                  onCopyDay={onCopyDay}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Stack>
      </CustomContainer>

      {serverError ? (
        <Alert status="error" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {serverError}
        </Alert>
      ) : null}

      {messages.length > 0 ? (
        <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <Box fontWeight="bold" mb={1}>
              Fix the following before saving
            </Box>
            <List styleType="disc" pl={4}>
              {messages.map((problem, index) => (
                // Two weekdays can fail the same way, so the message is not
                // a key; the list is short and never reordered.
                // eslint-disable-next-line react/no-array-index-key
                <ListItem key={index}>{problem}</ListItem>
              ))}
            </List>
          </Box>
        </Alert>
      ) : null}

      <Stack direction="row" spacing={3} justify="flex-end">
        <Link href={cancelHref} passHref>
          <Button variant="ghost" isDisabled={saving}>
            {canSubmit ? "Cancel" : "Back"}
          </Button>
        </Link>
        {canSubmit ? (
          <Button colorScheme="purple" isLoading={saving} onClick={onSubmit}>
            {submitLabel}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

export default WorkShiftForm;
