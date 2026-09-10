import React, { useState } from "react";
import {
  Box,
  Button,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Select,
  Stack,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import {
  ATTENDANCE_DAY_CUTOFF_TOOLTIP,
  DAY_LABELS,
  OT_RATE_OPTIONS,
  normalWorkDisplay,
} from "../../util/workShiftForm";

/**
 * Tab 4 — the weekly schedule. Seven rows, Sunday to Saturday, always.
 *
 * A shift is not "the days somebody bothered to fill in": the backend refuses
 * a schedule that is not the complete week, so the table renders all seven
 * whether or not the shift works them. A rest day is a row that says Rest, not
 * a missing row.
 *
 * NORMAL WORKING HOURS IS A DISPLAY, NOT AN INPUT. It shows Out − In − Break
 * and handles the overnight case (22:00 → 06:00 with a 00:30 break is 07:30),
 * but the figure that gets stored is the backend's own — the column is never
 * sent. See `util/workShiftForm.js`.
 *
 * COPY DAY IS UI ONLY. It fills other rows in the browser, and there is no
 * `copy_day` field in the payload or the schema. It copies the six columns
 * that make up a day's timing and nothing else.
 */

/** Pick the days to copy this row onto, then Apply. Multi-select, deliberately. */
function CopyDayMenu({ sourceDay, onCopy }) {
  const [selected, setSelected] = useState([]);

  const apply = () => {
    if (selected.length === 0) return;
    onCopy(selected.map(Number));
    setSelected([]);
  };

  return (
    <Menu closeOnSelect={false} placement="bottom-end">
      <MenuButton
        as={Button}
        size="xs"
        variant="outline"
        colorScheme="purple"
        rightIcon={<i className="fa fa-chevron-down" aria-hidden="true" />}
      >
        Copy
      </MenuButton>
      <MenuList minW="200px" maxH="320px" overflowY="auto">
        <MenuOptionGroup
          type="checkbox"
          value={selected}
          onChange={(value) => setSelected(Array.isArray(value) ? value : [value])}
          title={`Copy ${DAY_LABELS[sourceDay]} to`}
          fontSize="xs"
        >
          {DAY_LABELS.map((label, day) =>
            day === sourceDay ? null : (
              <MenuItemOption key={label} value={String(day)} fontSize="sm">
                {label}
              </MenuItemOption>
            )
          )}
        </MenuOptionGroup>
        <MenuDivider />
        <MenuItem
          closeOnSelect
          isDisabled={selected.length === 0}
          onClick={apply}
          fontSize="sm"
          color="purple.600"
        >
          Apply to {selected.length || "no"} day{selected.length === 1 ? "" : "s"}
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

/** A cell's input, with the row error shown underneath rather than swallowed. */
function CellInput({ error, children }) {
  return (
    <Box>
      {children}
      {error ? (
        <Text fontSize="10px" color="red.500" mt={1} maxW="140px">
          {error}
        </Text>
      ) : null}
    </Box>
  );
}

function WeeklyScheduleTab({ rows = [], rowErrors = {}, onRowChange, onCopyDay }) {
  const set = (day, key, value) => onRowChange(day, { [key]: value });

  return (
    <Stack spacing={3}>
      <Text fontSize="xs" color="gray.500">
        All seven days are saved together. On a rest day the timing fields are not
        used and the day contributes no working hours.
      </Text>

      <Box overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Day</Th>
              <Th>Working / Rest</Th>
              <Th>In</Th>
              <Th>Out</Th>
              <Th>
                <Stack direction="row" align="center" spacing={1}>
                  <span>Attendance Day Cutoff</span>
                  <Tooltip label={ATTENDANCE_DAY_CUTOFF_TOOLTIP} hasArrow maxW="340px">
                    <Box
                      as="span"
                      aria-label="Attendance Day Cutoff help"
                      tabIndex={0}
                      color="gray.400"
                      cursor="help"
                    >
                      <i className="fa fa-circle-info" aria-hidden="true" />
                    </Box>
                  </Tooltip>
                </Stack>
              </Th>
              <Th>Break Hours</Th>
              <Th>Normal Working Hours</Th>
              <Th>OT Rate</Th>
              <Th>Copy Day</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => {
              const day = Number(row.day_of_week);
              const errors = rowErrors[day] || {};
              const rest = !row.is_working_day;

              return (
                <Tr key={day} bg={rest ? "gray.50" : undefined}>
                  <Td fontWeight="medium" whiteSpace="nowrap">
                    {DAY_LABELS[day]}
                  </Td>

                  <Td>
                    <Stack direction="row" align="center" spacing={2}>
                      <Switch
                        size="sm"
                        colorScheme="purple"
                        isChecked={Boolean(row.is_working_day)}
                        onChange={(e) => set(day, "is_working_day", e.target.checked)}
                        aria-label={`${DAY_LABELS[day]} working day`}
                      />
                      <Text fontSize="xs" color={rest ? "gray.500" : "gray.700"}>
                        {rest ? "Rest" : "Working"}
                      </Text>
                    </Stack>
                  </Td>

                  <Td>
                    <CellInput error={errors.in_time}>
                      <Input
                        size="sm"
                        type="time"
                        w="120px"
                        value={row.in_time || ""}
                        isDisabled={rest}
                        isInvalid={Boolean(errors.in_time)}
                        onChange={(e) => set(day, "in_time", e.target.value)}
                        aria-label={`${DAY_LABELS[day]} in time`}
                      />
                    </CellInput>
                  </Td>

                  <Td>
                    <CellInput error={errors.out_time}>
                      <Input
                        size="sm"
                        type="time"
                        w="120px"
                        value={row.out_time || ""}
                        isDisabled={rest}
                        isInvalid={Boolean(errors.out_time)}
                        onChange={(e) => set(day, "out_time", e.target.value)}
                        aria-label={`${DAY_LABELS[day]} out time`}
                      />
                    </CellInput>
                  </Td>

                  <Td>
                    <CellInput error={errors.attendance_day_cutoff}>
                      <Input
                        size="sm"
                        type="time"
                        w="120px"
                        value={row.attendance_day_cutoff || ""}
                        isDisabled={rest}
                        isInvalid={Boolean(errors.attendance_day_cutoff)}
                        onChange={(e) => set(day, "attendance_day_cutoff", e.target.value)}
                        aria-label={`${DAY_LABELS[day]} attendance day cutoff`}
                      />
                    </CellInput>
                  </Td>

                  <Td>
                    <CellInput error={errors.break_hours}>
                      <Input
                        size="sm"
                        w="100px"
                        placeholder="HH:MM"
                        value={row.break_hours || ""}
                        isDisabled={rest}
                        isInvalid={Boolean(errors.break_hours)}
                        onChange={(e) => set(day, "break_hours", e.target.value)}
                        aria-label={`${DAY_LABELS[day]} break hours`}
                      />
                    </CellInput>
                  </Td>

                  <Td>
                    <Text fontSize="sm" color={rest ? "gray.400" : "gray.800"} fontFamily="mono">
                      {rest ? "—" : normalWorkDisplay(row) || "—"}
                    </Text>
                  </Td>

                  <Td>
                    <CellInput error={errors.ot_rate}>
                      <Select
                        size="sm"
                        w="90px"
                        value={String(row.ot_rate)}
                        onChange={(e) => set(day, "ot_rate", Number(e.target.value))}
                        aria-label={`${DAY_LABELS[day]} OT rate`}
                      >
                        {OT_RATE_OPTIONS.map((option) => (
                          <option key={option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </CellInput>
                  </Td>

                  <Td>
                    <CopyDayMenu
                      sourceDay={day}
                      onCopy={(targets) => onCopyDay(day, targets)}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

export default WeeklyScheduleTab;
