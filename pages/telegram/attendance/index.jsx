import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Flex,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import AttendanceDayList from "../../../components/attendance/AttendanceDayList";
import AttendanceDayDetail from "../../../components/attendance/AttendanceDayDetail";
import TelegramMissingDateList from "../../../components/telegram/TelegramMissingDateList";
import TelegramMonthNav from "../../../components/telegram/TelegramMonthNav";
import TelegramRegularizationForm from "../../../components/telegram/TelegramRegularizationForm";
import TelegramAttendanceHelper from "../../../helper/telegramAttendance";
import TelegramHelp from "../../../components/telegram/TelegramHelp";
import {
  apiMessage,
  currentMonth,
  isOk,
  navigationHint,
  sectionAtIndex,
  sectionFromQuery,
  sectionIndex,
} from "../../../util/telegramAttendance";

/**
 * THE TELEGRAM ATTENDANCE MINI APP - employee attendance self-service.
 *
 * THREE SECTIONS, and MY ATTENDANCE IS THE DEFAULT:
 *
 *   MY ATTENDANCE  the employee's own calculated month, read-only. Tapping a
 *                  day opens the existing Day Detail with NO action props,
 *                  so it renders as a read-only view of the punches and the
 *                  calculation. Month navigation stops at the current month.
 *
 *   CORRECTIONS    every date inside the regularisation window that needs a
 *                  correction or already has one, with its state - Missing
 *                  Attendance, Regularisation Pending, Regularised,
 *                  Regularisation Rejected. An actionable date opens the
 *                  form; Submit raises the ORDINARY Daily Needs request.
 *
 *   HELP           five sentences. No approval controls, here or anywhere.
 *
 * ======================================= `?section=` IS NAVIGATION ONLY ====
 *
 * The bot's home menu and the Regularise Attendance alert link straight to a
 * section - `?section=corrections&date=…` for the alert, so an employee who
 * tapped a button about a missing punch lands on the screen for it. The tabs
 * are CONTROLLED so that link can actually decide which one opens.
 *
 * A BARE `?date=` ALSO OPENS CORRECTIONS. Production has already sent alert
 * buttons in that older shape and they stay tappable in employees' chats
 * indefinitely; landing one on My Attendance would make the button appear to
 * do nothing. `sectionFromQuery` owns that whole rule - an explicit
 * recognised section wins, otherwise a valid date means Corrections,
 * otherwise My Attendance.
 *
 * IT CARRIES ZERO AUTHORITY. Both parameters choose a TAB and a HIGHLIGHT.
 * Neither is ever sent to the API, neither influences which employee anything
 * is read for, and there is no query parameter anywhere in this app that
 * could. A date the employee is not entitled to is not in the list the server
 * returns, so it highlights nothing.
 *
 * ================================= IT RENDERS THE EXISTING SCREENS =========
 *
 * `AttendanceDayList` and `AttendanceDayDetail` are the SAME components the
 * web My Attendance page uses, and every state they show - Final, Missing
 * Punch, Regularization Pending, Review Required, No Shift, Absent, Shift
 * Setup Issue - is decided by `util/attendanceV2.js#dayIssue` from the
 * engine's own status. NO ATTENDANCE STATE IS DECIDED HERE, and there is no
 * second calculation anywhere in this feature.
 *
 * Both are read-only here because the Mini App passes none of
 * `onRegularize`, `onRequestOt` or `onEditShift` - those buttons render only
 * when a handler is supplied. Correction is the Corrections section's job,
 * through its own form and the existing regularisation engine.
 *
 * ================================================== HOW IT KNOWS WHO YOU ARE
 *
 * `window.Telegram.WebApp.initData` - a query string Telegram signs with a
 * key derived from the bot token. It is posted, verbatim, to the session
 * endpoint; the SERVER verifies the signature, maps the signed Telegram user
 * id to an active `employee_telegram_identity`, and returns a short-lived
 * scoped token. Every later call carries that token in `x-telegram-session`.
 *
 * THE BROWSER NEVER CHOOSES, SUPPLIES OR CONTROLS THE EMPLOYEE IDENTITY.
 * There is no employee selector, no branch or outlet selector, no
 * designation and no approval role anywhere in this app; no request made
 * from here carries a field for any of them, and the API refuses one. The
 * employee is whoever Telegram's signature resolved to, server-side, on
 * every single call. `?date=` is read only as a NAVIGATION HINT - which
 * correction card to ring - and `navigationHint` is where that limit is
 * written down.
 *
 * NO BOT TOKEN IS IN THIS FILE OR REACHABLE FROM IT. `initData` is a
 * signature, not a credential, and it is useless without the token the
 * server holds.
 *
 * NO APPROVAL CONTROLS. What Submit creates walks the existing manager/HR
 * chain on the ordinary screens. Nobody approves anything from inside
 * Telegram.
 */
export default function TelegramAttendancePage() {
  const [ready, setReady] = useState(false);
  // CONTROLLED TABS. The index is state, seeded from `?section=` on load, so
  // a deep link opens the section it names instead of always landing on tab 0.
  const [tabIndex, setTabIndex] = useState(0);
  const [fatal, setFatal] = useState(null);
  const [notice, setNotice] = useState(null);

  // MY ATTENDANCE
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState([]);
  const [daysLoading, setDaysLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  // CORRECTIONS
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(true);
  const [hint, setHint] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /** One month of the authenticated employee's own days. Takes no employee. */
  const loadMonth = useCallback(async (which) => {
    setDaysLoading(true);
    try {
      const res = await TelegramAttendanceHelper.getMonth(which);
      if (!isOk(res)) {
        setDays([]);
        setNotice({ status: "error", text: apiMessage(res, "Your attendance could not be loaded") });
        return;
      }
      setDays(Array.isArray(res.days) ? res.days : []);
    } catch (err) {
      setDays([]);
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setDaysLoading(false);
    }
  }, []);

  /** The correction dates, always for the authenticated employee. */
  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    try {
      const res = await TelegramAttendanceHelper.getMissingDates();
      if (!isOk(res)) {
        setCorrections([]);
        setNotice({ status: "error", text: apiMessage(res, "Your corrections could not be loaded") });
        return;
      }
      setCorrections(Array.isArray(res.dates) ? res.dates : []);
    } catch (err) {
      setCorrections([]);
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setCorrectionsLoading(false);
    }
  }, []);

  /**
   * On load: tell Telegram we are ready, expand where supported, authenticate
   * with the signed `initData`, then load both sections.
   */
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const webApp = typeof window !== "undefined" && window.Telegram ? window.Telegram.WebApp : null;
      if (webApp) {
        if (typeof webApp.ready === "function") webApp.ready();
        if (typeof webApp.expand === "function") webApp.expand();
      }

      const search = typeof window === "undefined" ? "" : window.location.search;
      setHint(navigationHint(search));
      // Navigation only - see the header. An unknown section lands on tab 0.
      setTabIndex(sectionIndex(sectionFromQuery(search)));

      const initData = webApp && webApp.initData ? webApp.initData : "";
      if (!initData) {
        setDaysLoading(false);
        setCorrectionsLoading(false);
        setFatal("Please open this page from the Daily Needs bot in Telegram.");
        return;
      }

      try {
        const res = await TelegramAttendanceHelper.openSession(initData);
        if (cancelled) return;
        if (!isOk(res)) {
          setDaysLoading(false);
          setCorrectionsLoading(false);
          setFatal(apiMessage(res, "Telegram could not verify this session."));
          return;
        }
        setReady(true);
        await Promise.all([loadMonth(currentMonth()), loadCorrections()]);
      } catch (err) {
        if (cancelled) return;
        setDaysLoading(false);
        setCorrectionsLoading(false);
        setFatal("Could not reach the server. Please try again.");
      }
    };

    /**
     * WAIT FOR THE SDK, BUT NOT FOREVER. `next/script` loads it after the
     * page becomes interactive, so `window.Telegram` is usually a moment
     * behind this effect. Poll briefly, then start anyway - `start` handles
     * the no-SDK case with an honest message rather than a spinner that
     * never resolves.
     */
    const DEADLINE = Date.now() + 5000;
    let timer = null;
    const waitForSdk = () => {
      if (cancelled) return;
      const sdk = typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp;
      if (sdk || Date.now() > DEADLINE) {
        start();
        return;
      }
      timer = setTimeout(waitForSdk, 150);
    };
    waitForSdk();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadMonth, loadCorrections]);

  const changeMonth = (which) => {
    setMonth(which);
    setNotice(null);
    if (ready) loadMonth(which);
  };

  /** Open one correction date's form. */
  const openCorrection = async (attendanceDate) => {
    setNotice(null);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await TelegramAttendanceHelper.getDate(attendanceDate);
      if (!isOk(res)) {
        setNotice({ status: "error", text: apiMessage(res, "That date could not be opened") });
        return;
      }
      setDetail(res);
    } catch (err) {
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * On success BOTH sections are reloaded immediately: the date the employee
   * just submitted comes back showing "Regularisation Pending" and can no
   * longer be submitted, and My Attendance shows the day as Regularization
   * Pending too. The duplicate refusal is the backend's - `findOpenRequest`
   * in the existing engine - and the screen simply does not invite it.
   */
  const submit = async (body, onError) => {
    setSaving(true);
    try {
      const res = await TelegramAttendanceHelper.submitRegularization(body);
      if (!isOk(res)) {
        onError(apiMessage(res));
        return;
      }
      setDetail(null);
      setHint(body.attendance_date);
      setNotice({
        status: "success",
        title: "Regularisation submitted",
        text: "Your request has been sent for approval.",
      });
      await Promise.all([loadCorrections(), loadMonth(month)]);
    } catch (err) {
      onError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const banner = fatal ? (
    <Alert status="error" fontSize="sm" borderRadius="md">
      <AlertIcon />
      {fatal}
    </Alert>
  ) : notice ? (
    <Alert status={notice.status} fontSize="sm" borderRadius="md" mb={4}>
      <AlertIcon />
      <Box>
        {notice.title ? <Text fontWeight="700">{notice.title}</Text> : null}
        <Text>{notice.text}</Text>
      </Box>
    </Alert>
  ) : null;

  return (
    <>
      <Head>
        <title>My Attendance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {/*
        The official SDK. It is the ONLY source of `initData`.
        `afterInteractive` (the default) rather than `beforeInteractive`,
        which Next supports only from `_document` - and putting a Telegram
        script in `_document` would load it on every page of the whole app.
        The effect above waits for it.
      */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <Box minH="100vh" bg="gray.50">
        <Container maxW="560px" px={4} py={5}>
          <Text fontSize="xl" fontWeight="800" mb={3}>
            My Attendance
          </Text>

          {banner}

          {fatal ? null : !ready ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" color="purple.400" />
            </Flex>
          ) : detail || detailLoading ? (
            <TelegramRegularizationForm
              detail={detail}
              loading={detailLoading}
              saving={saving}
              onSubmit={submit}
              onBack={() => setDetail(null)}
            />
          ) : (
            /*
              MY ATTENDANCE IS TAB ZERO - what the Mini App opens on whenever
              `?section=` is absent or unrecognised. `sectionAtIndex` keeps the
              index and the section name in one mapping rather than two.
            */
            <Tabs
              colorScheme="purple"
              size="sm"
              isLazy
              index={tabIndex}
              onChange={(next) => setTabIndex(sectionIndex(sectionAtIndex(next)))}
            >
              <TabList mb={3}>
                <Tab>My Attendance</Tab>
                <Tab>Corrections</Tab>
                <Tab>Help</Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <TelegramMonthNav month={month} onChange={changeMonth} isDisabled={daysLoading} />
                  {/*
                    The web My Attendance list, unchanged. NO action handlers
                    are passed to the detail below, so every punch and every
                    figure is read-only.
                  */}
                  <AttendanceDayList
                    days={days}
                    loading={daysLoading}
                    onSelect={setSelectedDay}
                    emptyMessage="No attendance for this month yet."
                  />
                </TabPanel>

                <TabPanel px={0}>
                  <Stack spacing={3}>
                    <Text fontSize="xs" color="gray.500">
                      Dates that need a correction, and what happened to the ones you sent.
                    </Text>
                    <TelegramMissingDateList
                      dates={corrections}
                      loading={correctionsLoading}
                      highlight={hint}
                      onSelect={openCorrection}
                    />
                  </Stack>
                </TabPanel>

                <TabPanel px={0}>
                  <TelegramHelp />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Container>
      </Box>

      {/*
        READ-ONLY BY CONSTRUCTION: no `onRegularize`, no `onRequestOt`, no
        `onEditShift`, so the component renders none of those buttons.
      */}
      <AttendanceDayDetail
        day={selectedDay}
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </>
  );
}
