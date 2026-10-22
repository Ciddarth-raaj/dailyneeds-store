import React, { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import toast from "react-hot-toast";
import { Alert, AlertDescription, AlertIcon, Button, Flex, Stack, Text } from "@chakra-ui/react";

import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  downloadArticleStoreMaster,
  getArticleStoreMasterStatus,
  refreshArticleStoreMaster,
} from "../../helper/articleStoreMaster";

// Same key as All Products, which this report sits beside in the menu.
const PERMISSION_KEY = ["view_products"];
const POLL_MS = 5000;

/**
 * Article Store Master: every RetailPilot article with its details and its
 * stock at each store, as one Excel file. DNDS builds it every morning at
 * 5:45 AM; Refresh now rebuilds it on demand (a minute or two).
 */
function ArticleStoreMaster() {
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try {
      const s = await getArticleStoreMasterStatus();
      if (s?.code === 200) setStatus(s);
      return s;
    } catch (err) {
      return null;
    }
  }, []);

  // While a build runs, check again every few seconds; stop when it ends.
  const watch = useCallback(() => {
    clearTimeout(poll.current);
    poll.current = setTimeout(async () => {
      const s = await load();
      if (s?.running) {
        watch();
        return;
      }
      setRefreshing(false);
      if (s?.last_error) toast.error(`The report could not be built: ${s.last_error}`);
      else if (s?.latest) toast.success("The report is ready to download");
    }, POLL_MS);
  }, [load]);

  useEffect(() => {
    load().then((s) => {
      if (s?.running) {
        setRefreshing(true);
        watch();
      }
    });
    return () => clearTimeout(poll.current);
  }, [load, watch]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadArticleStoreMaster(status?.latest?.file);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await refreshArticleStoreMaster();
      if (r?.code !== 200) throw new Error(r?.msg || "Refresh could not be started");
      toast("Building the report from RetailPilot - this takes a minute or two");
      watch();
    } catch (err) {
      setRefreshing(false);
      toast.error(err.message);
    }
  };

  const latest = status?.latest;
  const builtAt = latest ? moment(latest.built_at).format("DD-MM-YYYY hh:mm A") : null;

  return (
    <GlobalWrapper title="Article Store Master" permissionKey={PERMISSION_KEY}>
      <CustomContainer title="Article Store Master" filledHeader>
        <Stack spacing={5}>
          <Text color="gray.600">
            Every article from RetailPilot with its supplier, brand, department, category,
            subcategory, HSN, tax, units and stock at each store. Built automatically every
            morning at 5:45 AM.
          </Text>

          <Text>
            {latest ? (
              <>
                Data as of <b>{builtAt}</b>
                {latest.size ? ` · ${(latest.size / (1024 * 1024)).toFixed(1)} MB` : ""}
              </>
            ) : (
              "The report has not been built yet."
            )}
          </Text>

          {status?.last_error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                The last build failed: {status.last_error}
                {latest ? " The previous file is still available below." : ""}
              </AlertDescription>
            </Alert>
          )}

          <Flex gap={3} wrap="wrap">
            <Button colorScheme="purple" onClick={onDownload} isLoading={downloading} loadingText="Downloading" isDisabled={!latest || downloading}>
              Download Excel
            </Button>
            <Button colorScheme="purple" variant="outline" onClick={onRefresh} isLoading={refreshing} loadingText="Building from RetailPilot" isDisabled={refreshing}>
              Refresh now
            </Button>
          </Flex>
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ArticleStoreMaster;
