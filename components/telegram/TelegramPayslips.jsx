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
 * DOWNLOAD. THE NORMAL PATH IS AUTHENTICATED: the PDF is fetched with the
 * `x-telegram-session` header and saved from memory - no token in any URL.
 *
 * ONLY WHERE THAT CANNOT WORK - Telegram on iOS, whose WebView will not save
 * a blob - is Telegram's own downloader (`WebApp.downloadFile`, 8.0+) used.
 * It fetches a URL itself, without our header, so it is handed a link the
 * server issues for this one payslip: opaque, single-use, 60 seconds.
 */
function telegramWebApp() {
  return typeof window !== "undefined" && window.Telegram ? window.Telegram.WebApp : null;
}

/** The link fallback: iOS Telegram only, and only where downloadFile exists. */
function needsLinkDownload(webApp) {
  return Boolean(
    webApp &&
      webApp.platform === "ios" &&
      typeof webApp.downloadFile === "function" &&
      typeof webApp.isVersionAtLeast === "function" &&
      webApp.isVersionAtLeast("8.0")
  );
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
      if (needsLinkDownload(webApp)) {
        const link = await TelegramAttendanceHelper.payslipPdfLink(open.ref);
        if (!isOk(link)) {
          setNotice({ status: "error", text: apiMessage(link, "The PDF could not be prepared") });
          return;
        }
        webApp.downloadFile({
          url: TelegramAttendanceHelper.absoluteUrl(link.path),
          file_name: link.filename,
        });
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
