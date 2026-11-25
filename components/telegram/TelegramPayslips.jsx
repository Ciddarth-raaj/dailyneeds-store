import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import PayslipDetail from "../payslip/PayslipDetail";
import TelegramAttendanceHelper from "../../helper/telegramAttendance";
import { isOk, apiMessage, launchValue, versionAtLeast } from "../../util/telegramAttendance";

/**
 * MY PAYSLIPS - the employee's own published payslips, newest month first.
 *
 * NO EMPLOYEE IS NAMED ANYWHERE IN THIS FILE. The list, the detail and the
 * PDF are all answered for the signed Mini App session's employee; a payslip
 * is named only by the random `ref` the list returned.
 *
 * THE DETAIL IS THE FROZEN SNAPSHOT, and the PDF is rendered on the server
 * from the same snapshot - the two always show the same figures.
 *
 * DOWNLOAD. INSIDE THE TELEGRAM APPS A BLOB CANNOT BE SAVED: the Android
 * and iOS WebViews ignore `<a download>` on a `blob:` URL. There the request
 * goes to Telegram's own downloader (`web_app_request_file_download`, app
 * version 8.0+), or on an older app to the system browser
 * (`web_app_open_link`). Both fetch a URL themselves, without our header, so
 * they are handed a link the server issues for this one payslip: opaque,
 * few-use, 60 seconds.
 *
 * NOT THROUGH THE SDK'S `downloadFile`. The SDK learns the platform and
 * version from the launch hash when its script loads, and on this page that
 * hash can already be gone: it then reports "unknown" / "6.0", refuses
 * `downloadFile`, and the tap did nothing. A Telegram app is recognised by
 * its native bridge (`TelegramWebviewProxy`), the version is read from the
 * launch URL the page captured, and the event is posted on that bridge.
 *
 * ONLY OUTSIDE THE APPS (Telegram Web, or the page opened directly) is the
 * PDF fetched with the `x-telegram-session` header and saved from memory.
 */
function nativeBridge() {
  return typeof window !== "undefined" && window.TelegramWebviewProxy && typeof window.TelegramWebviewProxy.postEvent === "function"
    ? window.TelegramWebviewProxy
    : null;
}

/** The app's Mini App version: the launch URL first, then the SDK unless it is only guessing. */
function appVersion(launch) {
  const fromLaunch = launch ? launchValue(launch, "tgWebAppVersion") : "";
  if (fromLaunch) return fromLaunch;
  const webApp = typeof window !== "undefined" && window.Telegram ? window.Telegram.WebApp : null;
  return webApp && webApp.version && webApp.version !== "6.0" ? webApp.version : "";
}

/** How the PDF is saved: "downloader", "browser" (open the link) or "blob". */
function downloadMode(launch) {
  if (!nativeBridge()) return "blob";
  const version = appVersion(launch);
  // An unknown version is tried with the downloader; "Open in browser" stays offered.
  return version && !versionAtLeast(version, "8.0") ? "browser" : "downloader";
}

function postToTelegram(eventType, eventData) {
  nativeBridge().postEvent(eventType, JSON.stringify(eventData));
}

/** Telegram's answer to the download popup, through the SDK's event hub when it is loaded. */
function onDownloadAnswer(handler) {
  const webView = typeof window !== "undefined" && window.Telegram ? window.Telegram.WebView : null;
  if (!webView || typeof webView.onEvent !== "function") return () => {};
  const listener = (eventType, eventData) => {
    webView.offEvent("file_download_requested", listener);
    handler(Boolean(eventData && eventData.status === "downloading"));
  };
  webView.onEvent("file_download_requested", listener);
  return () => webView.offEvent("file_download_requested", listener);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function TelegramPayslips({ launch = null } = {}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(null); // { ref, payslip } | { ref, loading: true }
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await TelegramAttendanceHelper.listPayslips();
      if (!isOk(res)) {
        setList([]);
        setNotice({ status: "error", text: apiMessage(res, "Your payslips could not be loaded") });
        return;
      }
      setList(Array.isArray(res.payslips) ? res.payslips : []);
    } catch (err) {
      setList([]);
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const view = async (ref) => {
    setNotice(null);
    setOpen({ ref, loading: true });
    try {
      const res = await TelegramAttendanceHelper.getPayslip(ref);
      if (!isOk(res)) {
        setOpen(null);
        setNotice({ status: "error", text: apiMessage(res, "This payslip is no longer available") });
        load();
        return;
      }
      setOpen({ ref, payslip: res.payslip });
    } catch (err) {
      setOpen(null);
      setNotice({ status: "error", text: "Could not reach the server. Please try again." });
    }
  };

  /** A fresh link for this payslip, or null with the notice already set. */
  const freshLink = async () => {
    const link = await TelegramAttendanceHelper.payslipPdfLink(open.ref);
    if (!isOk(link)) {
      setNotice({ status: "error", text: apiMessage(link, "The PDF could not be prepared") });
      return null;
    }
    return link;
  };

  const download = async () => {
    if (!open || !open.payslip) return;
    setDownloading(true);
    setNotice(null);
    try {
      const mode = downloadMode(launch);
      if (mode !== "blob") {
        const link = await freshLink();
        if (!link) return;
        const url = TelegramAttendanceHelper.absoluteUrl(link.path);
        if (mode === "downloader") {
          onDownloadAnswer((started) => {
            setNotice(
              started
                ? { status: "success", text: "Download started. Find the PDF in your Downloads." }
                : { status: "info", text: "Download cancelled." }
            );
          });
          postToTelegram("web_app_request_file_download", { url, file_name: link.filename });
          setNotice({
            status: "info",
            text: "Confirm the download in Telegram's popup. No popup? Use Open in browser.",
            browser: true,
          });
        } else {
          postToTelegram("web_app_open_link", { url });
        }
        return;
      }
      const res = await TelegramAttendanceHelper.payslipPdf(open.ref);
      if (res.status !== 200) {
        setNotice({ status: "error", text: "The PDF could not be prepared. Please try again." });
        return;
      }
      saveBlob(res.blob, open.payslip.filename || "Payslip.pdf");
    } catch (err) {
      setNotice({ status: "error", text: "The PDF could not be downloaded. Please try again." });
    } finally {
      setDownloading(false);
    }
  };

  /** The way out when Telegram's downloader says nothing: the system browser saves it. */
  const openInBrowser = async () => {
    if (!open || !open.payslip || !nativeBridge()) return;
    setDownloading(true);
    try {
      const link = await freshLink();
      if (!link) return;
      postToTelegram("web_app_open_link", { url: TelegramAttendanceHelper.absoluteUrl(link.path) });
    } catch (err) {
      setNotice({ status: "error", text: "The PDF could not be downloaded. Please try again." });
    } finally {
      setDownloading(false);
    }
  };

  const banner = notice ? (
    <Alert status={notice.status} fontSize="sm" borderRadius="md" mb={3}>
      <AlertIcon />
      <Box flex="1">{notice.text}</Box>
      {notice.browser ? (
        <Button size="xs" ml={2} onClick={openInBrowser} isLoading={downloading}>
          Open in browser
        </Button>
      ) : null}
    </Alert>
  ) : null;

  if (open) {
    return (
      <Stack spacing={3}>
        {banner}
        <Flex justify="space-between" align="center">
          <Button size="sm" variant="ghost" onClick={() => setOpen(null)} px={0}>
            ← My Payslips
          </Button>
          {open.payslip ? (
            <Button size="sm" colorScheme="purple" onClick={download} isLoading={downloading}>
              Download PDF
            </Button>
          ) : null}
        </Flex>
        {open.loading ? (
          <Flex justify="center" py={8}>
            <Spinner color="purple.400" />
          </Flex>
        ) : (
          <PayslipDetail snapshot={open.payslip.snapshot} />
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {banner}
      <Text fontSize="xs" color="gray.500">
        Your published payslips. Tap a month to view it.
      </Text>
      {loading ? (
        <Flex justify="center" py={8}>
          <Spinner color="purple.400" />
        </Flex>
      ) : list.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No payslips have been published for you yet.
        </Text>
      ) : (
        list.map((p) => (
          <Box
            key={p.payslip_ref}
            as="button"
            type="button"
            onClick={() => view(p.payslip_ref)}
            textAlign="left"
            bg="white"
            borderWidth="1px"
            borderRadius="md"
            px={4}
            py={3}
          >
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontWeight="700" fontSize="sm">
                  {p.label}
                </Text>
                <Text fontSize="xs" color="green.600">
                  {p.status || "Published"}
                </Text>
              </Box>
              <Text fontSize="sm" color="purple.600" fontWeight="600">
                View
              </Text>
            </Flex>
          </Box>
        ))
      )}
    </Stack>
  );
}
