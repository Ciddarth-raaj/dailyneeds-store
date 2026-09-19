import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import { Alert, AlertIcon, Box, Container, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import TelegramMissingDateList from "../../../components/telegram/TelegramMissingDateList";
import TelegramRegularizationForm from "../../../components/telegram/TelegramRegularizationForm";
import TelegramAttendanceHelper from "../../../helper/telegramAttendance";
import { apiMessage, isOk, navigationHint } from "../../../util/telegramAttendance";

/**
 * THE TELEGRAM ATTENDANCE MINI APP.
 *
 * Opened from the "Regularise Attendance" button on the 06:00 Missing
 * Attendance message. NO GlobalWrapper: no sidebar, no top bar, no desktop
 * chrome - this renders inside Telegram's mobile WebView and nothing else.
 *
 * ================================================== HOW IT KNOWS WHO YOU ARE
 *
 * `window.Telegram.WebApp.initData` - a query string Telegram signs with a
 * key derived from the bot token. It is posted, verbatim, to the session
 * endpoint; the SERVER verifies the signature, maps the signed Telegram user
 * id to an active `employee_telegram_identity`, and returns a short-lived
 * scoped token. Every later call carries that token.
 *
 * THIS PAGE NEVER DECIDES, SENDS OR HOLDS AN EMPLOYEE ID. There is no
 * selector, no query parameter and no stored value for one; the API refuses
 * a request that names an employee at all. `?date=` is read only as a
 * NAVIGATION HINT - which card to ring - and `navigationHint` is where that
 * limit is written down.
 *
 * NO BOT TOKEN IS IN THIS FILE OR REACHABLE FROM IT. `initData` is a
 * signature, not a credential, and it is useless without the token the
 * server holds.
 *
 * NO APPROVAL CONTROLS. What Submit creates is the ordinary Daily Needs
 * regularisation request, and it walks the existing manager/HR chain on the
 * ordinary screens. Nobody approves anything from inside Telegram.
 */
export default function TelegramAttendancePage() {
  const [phase, setPhase] = useState("AUTH"); // AUTH | LIST | DETAIL
  const [fatal, setFatal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [hint, setHint] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  /** The list, always for the authenticated employee - it takes no argument. */
  const loadDates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await TelegramAttendanceHelper.getMissingDates();
      if (!isOk(res)) {
        setFatal(apiMessage(res, "Your attendance could not be loaded"));
        return;
      }
      setDates(Array.isArray(res.dates) ? res.dates : []);
    } catch (err) {
      setFatal("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * On load: tell Telegram we are ready, expand where supported, authenticate
   * with the signed `initData`, then load the dates.
   */
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const webApp = typeof window !== "undefined" && window.Telegram ? window.Telegram.WebApp : null;
      if (webApp) {
        if (typeof webApp.ready === "function") webApp.ready();
        if (typeof webApp.expand === "function") webApp.expand();
      }

      setHint(navigationHint(typeof window === "undefined" ? "" : window.location.search));

      const initData = webApp && webApp.initData ? webApp.initData : "";
      if (!initData) {
        setLoading(false);
        setFatal("Please open this page from the Daily Needs bot in Telegram.");
        return;
      }

      try {
        const res = await TelegramAttendanceHelper.openSession(initData);
        if (cancelled) return;
        if (!isOk(res)) {
          setLoading(false);
          setFatal(apiMessage(res, "Telegram could not verify this session."));
          return;
        }
        setPhase("LIST");
        await loadDates();
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
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
      const ready = typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp;
      if (ready || Date.now() > DEADLINE) {
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
  }, [loadDates]);

  const openDate = async (attendanceDate) => {
    setNotice(null);
    setPhase("DETAIL");
    setLoading(true);
    setDetail(null);
    try {
      const res = await TelegramAttendanceHelper.getDate(attendanceDate);
      if (!isOk(res)) {
        setPhase("LIST");
        setNotice({ status: "error", text: apiMessage(res, "That date could not be opened") });
        return;
      }
      setDetail(res);
    } catch (err) {
      setPhase("LIST");
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  /**
   * On success the list is reloaded IMMEDIATELY, so the date the employee just
   * submitted comes back showing "Regularisation Pending" and can no longer
   * be submitted again. The duplicate refusal is the backend's, but the screen
   * does not invite it.
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
      setPhase("LIST");
      setNotice({
        status: "success",
        title: "Regularisation submitted",
        text: "Your request has been sent for approval.",
      });
      setHint(body.attendance_date);
      await loadDates();
    } catch (err) {
      onError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Missing Attendance</title>
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
        <Container maxW="520px" px={4} py={5}>
          <Text fontSize="xl" fontWeight="800" mb={1}>
            Missing Attendance
          </Text>
          <Text fontSize="xs" color="gray.500" mb={4}>
            Submit the missing punch and a reason. It goes for approval as usual.
          </Text>

          {notice ? (
            <Alert status={notice.status} fontSize="sm" borderRadius="md" mb={4}>
              <AlertIcon />
              <Box>
                {notice.title ? <Text fontWeight="700">{notice.title}</Text> : null}
                <Text>{notice.text}</Text>
              </Box>
            </Alert>
          ) : null}

          {fatal ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {fatal}
            </Alert>
          ) : phase === "AUTH" ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" color="purple.400" />
            </Flex>
          ) : phase === "DETAIL" ? (
            <TelegramRegularizationForm
              detail={detail}
              loading={loading}
              saving={saving}
              onSubmit={submit}
              onBack={() => {
                setDetail(null);
                setPhase("LIST");
              }}
            />
          ) : (
            <Stack spacing={4}>
              <TelegramMissingDateList
                dates={dates}
                loading={loading}
                highlight={hint}
                onSelect={openDate}
              />
            </Stack>
          )}
        </Container>
      </Box>
    </>
  );
}
