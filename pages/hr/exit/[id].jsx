import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";

import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import usePayrollActor from "../../../customHooks/usePayrollActor";
import EmployeeExitHelper from "../../../helper/employeeExit";
import {
  canViewExitInterview,
  canManageExitInterview,
  canOverrideRehire,
  REHIRE_COLOR,
  REHIRE_LABEL,
} from "../../../util/fnfAccess";

/**
 * HR -> Exit Interview & Rehire Eligibility, for ONE employee.
 *
 * CONFIDENTIAL. Read with `view_exit_interview`; nothing on this screen ever
 * reaches the employee's payslip, F&F statement, the Mini App or Telegram.
 *
 * EVERY EXIT IS ITS OWN RECORD. A rejoined employee has one exit per
 * employment spell; the interview and the rehire assessments of each stay
 * with that exit. A rehire assessment is append-only: changing it is an
 * override with a reason, and the earlier decision is kept in the history.
 */

const REASONS = [
  ["BETTER_OPPORTUNITY", "Better opportunity"],
  ["COMPENSATION", "Salary / compensation"],
  ["WORK_ENVIRONMENT", "Work environment"],
  ["MANAGER_RELATIONSHIP", "Manager / supervisor"],
  ["WORKING_HOURS", "Working hours / shifts"],
  ["PERSONAL_FAMILY", "Personal / family"],
  ["RELOCATION", "Relocation"],
  ["HEALTH", "Health"],
  ["HIGHER_STUDIES", "Higher studies"],
  ["TERMINATED", "Terminated by company"],
  ["ABSCONDED", "Absconded"],
  ["OTHER", "Other"],
];
const RATINGS = [
  ["rating_job_satisfaction", "Job satisfaction"],
  ["rating_manager_support", "Support from manager"],
  ["rating_work_environment", "Work environment"],
  ["rating_compensation", "Salary & benefits"],
];
const today = () => new Date().toISOString().slice(0, 10);
const blankInterview = (exitDate) => ({
  exit_date: exitDate,
  interview_date: today(),
  primary_reason: "",
  rating_job_satisfaction: "",
  rating_manager_support: "",
  rating_work_environment: "",
  rating_compensation: "",
  would_recommend: "",
  would_return: "",
  feedback: "",
  suggestions: "",
});

function ExitInterviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const actor = usePayrollActor();
  const canView = canViewExitInterview(actor);
  const canManage = canManageExitInterview(actor);
  const canOverride = canOverrideRehire(actor);

  const [exits, setExits] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [interview, setInterview] = useState(blankInterview(null));
  const [rehire, setRehire] = useState({ eligibility: "", conditions: "", note: "", override_reason: "" });
  const [busy, setBusy] = useState(false);

  const loadExits = useCallback(async () => {
    if (!canView || !id) return;
    const res = await EmployeeExitHelper.getEmployeeExits(id);
    if (res.code !== 200) {
      toast({ status: "error", title: res.msg || "Could not load the exits" });
      return;
    }
    setExits(res);
    setSelected((cur) => cur || (res.exits[0] ? res.exits[0].exit_date : null));
  }, [canView, id, toast]);

  useEffect(() => {
    loadExits();
  }, [loadExits]);

  const current = exits && exits.exits.find((e) => e.exit_date === selected);

  useEffect(() => {
    setInterview(blankInterview(selected));
    setRehire({ eligibility: "", conditions: "", note: "", override_reason: "" });
    setDetail(null);
    if (!current || !current.settlement_id) return;
    EmployeeExitHelper.getExitDetail(id, current.settlement_id).then((res) => {
      if (res.code !== 200) return;
      setDetail(res);
      if (res.interview) {
        const iv = res.interview;
        setInterview({
          ...blankInterview(selected),
          ...Object.fromEntries(Object.entries(iv).map(([k, v]) => [k, v === null ? "" : String(v)])),
          exit_date: selected,
        });
      }
    });
  }, [current, id, selected]);

  const saveInterview = async () => {
    setBusy(true);
    try {
      const body = { ...interview };
      RATINGS.forEach(([k]) => {
        body[k] = body[k] === "" ? null : Number(body[k]);
      });
      ["would_recommend", "would_return"].forEach((k) => {
        if (body[k] === "") body[k] = null;
      });
      const allowed = ["exit_date", "interview_date", "primary_reason", ...RATINGS.map(([k]) => k), "would_recommend", "would_return", "feedback", "suggestions"];
      const res = await EmployeeExitHelper.saveInterview(id, Object.fromEntries(allowed.map((k) => [k, body[k]])));
      if (res.code !== 200) throw new Error(res.msg || "Not saved");
      toast({ status: "success", title: "Exit interview saved" });
      await loadExits();
    } catch (err) {
      toast({ status: "error", title: err.message });
    } finally {
      setBusy(false);
    }
  };

  const saveRehire = async () => {
    setBusy(true);
    try {
      const res = await EmployeeExitHelper.assessRehire(id, { exit_date: selected, ...rehire });
      if (res.code !== 200) throw new Error(res.msg || "Not saved");
      toast({ status: "success", title: res.outcome === "OVERRIDDEN" ? "Rehire assessment overridden" : "Rehire assessment recorded" });
      await loadExits();
    } catch (err) {
      toast({ status: "error", title: err.message });
    } finally {
      setBusy(false);
    }
  };

  const assessed = Boolean(current && current.rehire);
  const mayAssess = assessed ? canOverride : canManage;

  const body = () => {
    if (!canView) {
      return (
        <Alert status="warning">
          <AlertIcon />
          Exit interviews and rehire assessments are confidential. You do not have permission to view them.
        </Alert>
      );
    }
    if (!exits) return <Spinner />;
    if (exits.exits.length === 0) return <Text color="gray.500">This employee has no recorded exit.</Text>;
    return (
      <Stack spacing={5}>
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          Confidential HR record. It is never shown to the employee or printed on any payslip or F&amp;F statement.
        </Alert>
        <HStack>
          <Text fontSize="sm">Exit</Text>
          <Select width="260px" value={selected || ""} onChange={(e) => setSelected(e.target.value)}>
            {exits.exits.map((e) => (
              <option key={e.exit_date} value={e.exit_date}>
                {e.exit_date} — F&amp;F {e.settlement_status === "SETTLED" ? "settled" : "pending"}
              </option>
            ))}
          </Select>
          {current && current.rehire ? (
            <Badge colorScheme={REHIRE_COLOR[current.rehire.eligibility]}>{REHIRE_LABEL[current.rehire.eligibility]}</Badge>
          ) : (
            <Badge>Rehire not assessed</Badge>
          )}
        </HStack>

        <Box>
          <Heading size="sm" mb={3}>
            Exit interview {detail && detail.interview ? `(revision ${detail.interview.revision})` : ""}
          </Heading>
          <Stack spacing={3} maxWidth="720px">
            <HStack>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Interview date</FormLabel>
                <Input type="date" max={today()} isDisabled={!canManage} value={interview.interview_date}
                  onChange={(e) => setInterview({ ...interview, interview_date: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Main reason for leaving</FormLabel>
                <Select placeholder="Choose" isDisabled={!canManage} value={interview.primary_reason}
                  onChange={(e) => setInterview({ ...interview, primary_reason: e.target.value })}>
                  {REASONS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>
            <HStack flexWrap="wrap">
              {RATINGS.map(([k, l]) => (
                <FormControl key={k} width="170px">
                  <FormLabel fontSize="xs">{l} (1–5)</FormLabel>
                  <Select placeholder="—" isDisabled={!canManage} value={interview[k]}
                    onChange={(e) => setInterview({ ...interview, [k]: e.target.value })}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </HStack>
            <HStack>
              {[["would_recommend", "Would recommend us to others?"], ["would_return", "Would consider coming back?"]].map(([k, l]) => (
                <FormControl key={k}>
                  <FormLabel fontSize="sm">{l}</FormLabel>
                  <RadioGroup value={interview[k]} onChange={(v) => setInterview({ ...interview, [k]: v })} isDisabled={!canManage}>
                    <HStack>
                      <Radio value="YES">Yes</Radio>
                      <Radio value="NO">No</Radio>
                    </HStack>
                  </RadioGroup>
                </FormControl>
              ))}
            </HStack>
            <FormControl>
              <FormLabel fontSize="sm">Feedback</FormLabel>
              <Textarea maxLength={1000} isDisabled={!canManage} value={interview.feedback}
                onChange={(e) => setInterview({ ...interview, feedback: e.target.value })} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Suggestions</FormLabel>
              <Textarea maxLength={1000} isDisabled={!canManage} value={interview.suggestions}
                onChange={(e) => setInterview({ ...interview, suggestions: e.target.value })} />
            </FormControl>
            {canManage ? (
              <Box>
                <Button colorScheme="purple" onClick={saveInterview} isLoading={busy} isDisabled={!interview.primary_reason}>
                  Save interview
                </Button>
              </Box>
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Box maxWidth="720px">
          <Heading size="sm" mb={3}>
            Fit for rehire
          </Heading>
          {mayAssess ? (
            <Stack spacing={3}>
              <RadioGroup value={rehire.eligibility} onChange={(v) => setRehire({ ...rehire, eligibility: v })}>
                <HStack>
                  <Radio value="YES">Yes</Radio>
                  <Radio value="NO">No</Radio>
                  <Radio value="CONDITIONAL">Conditional</Radio>
                </HStack>
              </RadioGroup>
              {rehire.eligibility === "CONDITIONAL" ? (
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Conditions</FormLabel>
                  <Input maxLength={500} value={rehire.conditions} onChange={(e) => setRehire({ ...rehire, conditions: e.target.value })} />
                </FormControl>
              ) : null}
              <FormControl>
                <FormLabel fontSize="sm">Note</FormLabel>
                <Input maxLength={500} value={rehire.note} onChange={(e) => setRehire({ ...rehire, note: e.target.value })} />
              </FormControl>
              {assessed ? (
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Reason for overriding the current assessment</FormLabel>
                  <Input maxLength={500} value={rehire.override_reason} onChange={(e) => setRehire({ ...rehire, override_reason: e.target.value })} />
                </FormControl>
              ) : null}
              <Box>
                <Button colorScheme="purple" onClick={saveRehire} isLoading={busy} isDisabled={!rehire.eligibility}>
                  {assessed ? "Override assessment" : "Record assessment"}
                </Button>
              </Box>
            </Stack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              {assessed ? "Changing this assessment needs the Override Rehire Eligibility permission." : "Recording an assessment needs the Manage Exit Interview permission."}
            </Text>
          )}
          {detail && detail.rehire_history && detail.rehire_history.length > 0 ? (
            <Box mt={4}>
              <Text fontSize="sm" fontWeight="semibold">
                History
              </Text>
              {detail.rehire_history.map((h) => (
                <Text key={h.rehire_assessment_id} fontSize="xs" color="gray.600">
                  {h.assessed_at} · {REHIRE_LABEL[h.eligibility]}
                  {h.conditions ? ` (${h.conditions})` : ""}
                  {h.is_override ? ` · override: ${h.override_reason}` : ""}
                  {h.assessed_by ? ` · by ${h.assessed_by}` : ""}
                </Text>
              ))}
            </Box>
          ) : null}
        </Box>
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Exit Interview">
      <CustomContainer title={`Exit Interview & Rehire — Employee ${id || ""}`} subtitle="Confidential HR record">
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ExitInterviewPage;
