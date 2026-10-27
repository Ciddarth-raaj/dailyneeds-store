import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import PayslipDetail from "../payslip/PayslipDetail";
import TelegramAttendanceHelper from "../../helper/telegramAttendance";
import { isOk, apiMessage } from "../../util/telegramAttendance";

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
 * and iOS WebViews ignore `<a download>` on a `blob:` URL, so the button did
 * nothing. There Telegram's own downloader (`WebApp.downloadFile`, 8.0+) is
 * used, or on an older app the system browser (`openLink`). Both fetch a URL
 * themselves, without our header, so they are handed a link the server
 * issues for this one payslip: opaque, few-use, 60 seconds.
 *
 * ONLY IN A BROWSER (Telegram Web, or the page opened directly) is the PDF
 * fetched with the `x-telegram-session` header and saved from memory.
 */
function telegramWebApp() {
  return typeof window !== "undefined" && window.Telegram ? window.Telegram.WebApp : null;
}

/** Telegram Web runs in a real browser tab, where a blob saves normally. */
const BROWSER_PLATFORMS = ["web", "weba", "webk", "unknown"];

/** How the PDF is saved: "downloader", "browser" (openLink) or "blob". */
function downloadMode(webApp) {
  if (!webApp || !webApp.platform || BROWSER_PLATFORMS.includes(webApp.platform)) return "blob";
  if (
    typeof webApp.downloadFile === "function" &&
    typeof webApp.isVersionAtLeast === "function" &&
    webApp.isVersionAtLeast("8.0")
  ) {
    return "downloader";
  }
  return typeof webApp.openLink === "function" ? "browser" : "blob";
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

export default function TelegramPayslips() {
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

  const download = async () => {
    if (!open || !open.payslip) return;
    setDownloading(true);
    setNotice(null);
    try {
      const webApp = telegramWebApp();
      const mode = downloadMode(webApp);
      if (mode !== "blob") {
        const link = await TelegramAttendanceHelper.payslipPdfLink(open.ref);
        if (!isOk(link)) {
          setNotice({ status: "error", text: apiMessage(link, "The PDF could not be prepared") });
          return;
        }
        const url = TelegramAttendanceHelper.absoluteUrl(link.path);
        if (mode === "downloader") {
          webApp.downloadFile({ url, file_name: link.filename }, (confirmed) => {
            if (confirmed) setNotice({ status: "success", text: "Download started. Find the PDF in your Downloads." });
          });
        } else {
          webApp.openLink(url);
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

  const banner = notice ? (
    <Alert status={notice.status} fontSize="sm" borderRadius="md" mb={3}>
      <AlertIcon />
      {notice.text}
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
