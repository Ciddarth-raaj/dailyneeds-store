import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useDisclosure } from "@chakra-ui/react";
import toast from "react-hot-toast";
import product from "../../helper/product";
import ImagesArchiveActionButton from "./ImagesArchiveActionButton";
import ImagesArchiveProgressModal from "./ImagesArchiveProgressModal";

const POLL_INTERVAL_MS = 1700;

function toPercent(progress) {
  const b = Number(progress?.bytes_percent);
  if (Number.isFinite(b) && b >= 0) return Math.max(0, Math.min(100, b));
  const f = Number(progress?.files_percent);
  if (Number.isFinite(f) && f >= 0) return Math.max(0, Math.min(100, f));
  return 0;
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let value = n;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function getStatusMeta(progress) {
  if (progress?.status === "failed") {
    return { label: "Failed", colorScheme: "red" };
  }
  if (progress?.status === "cancelled") {
    return { label: "Cancelled", colorScheme: "orange" };
  }
  if (progress?.ready || progress?.status === "ready") {
    return { label: "Ready", colorScheme: "green" };
  }
  return { label: "In Progress", colorScheme: "purple" };
}

function getStageLabel(stage) {
  if (stage === "listing") return "Preparing file list";
  if (stage === "downloading") return "Downloading images";
  if (stage === "zipping") return "Creating ZIP archive";
  if (stage === "ready") return "Archive ready";
  if (stage === "cancelled") return "Cancelled";
  if (stage === "failed") return "Failed";
  return "Processing";
}

function ImagesArchiveDownloadControl() {
  const router = useRouter();
  const { query } = router;
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadingStart, setDownloadingStart] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const pollTimerRef = useRef(null);
  const restoredFromQueryJobIdRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const setJobIdInQuery = useCallback(
    (jobId) => {
      if (!router.isReady || !jobId) return;
      const currentJobId =
        typeof router.query.jobId === "string"
          ? router.query.jobId
          : router.query.jobId?.[0];
      if (currentJobId === String(jobId)) return;
      router.replace(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            jobId: String(jobId),
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const clearJobIdFromQuery = useCallback(() => {
    if (!router.isReady || !router.query.jobId) return;
    const nextQuery = { ...router.query };
    delete nextQuery.jobId;
    router.replace(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: true }
    );
  }, [router]);

  const pollJob = useCallback(
    async (jobId) => {
      if (!jobId) return;
      try {
        const progress = await product.getImagesDownloadStatus(jobId);
        if (!progress) {
          clearPoll();
          return;
        }
        setDownloadProgress(progress);
        if (
          progress.ready ||
          progress.status === "failed" ||
          progress.status === "cancelled"
        ) {
          clearPoll();
          const queryJobId =
            typeof router.query.jobId === "string"
              ? router.query.jobId
              : router.query.jobId?.[0];
          const keepReadyFromQuery =
            Boolean(progress.ready) &&
            restoredFromQueryJobIdRef.current != null &&
            String(restoredFromQueryJobIdRef.current) === String(progress.job_id) &&
            queryJobId != null &&
            String(queryJobId) === String(progress.job_id);
          if (!keepReadyFromQuery) {
            clearJobIdFromQuery();
          }
          if (progress.status === "cancelled") {
            setDownloadProgress(null);
            onClose();
          }
          return;
        }
        pollTimerRef.current = setTimeout(
          () => pollJob(jobId),
          POLL_INTERVAL_MS
        );
      } catch (err) {
        clearPoll();
        if (err?.status === 404 || err?.code === 404) {
          clearJobIdFromQuery();
          setDownloadProgress(null);
          onClose();
          return;
        }
        toast.error(err?.message || "Failed to fetch image download status");
      }
    },
    [clearJobIdFromQuery, clearPoll, onClose, router.query.jobId]
  );

  useEffect(
    () => () => {
      clearPoll();
    },
    [clearPoll]
  );

  const handleStartImagesDownload = async () => {
    setDownloadingStart(true);
    try {
      const progress = await product.startImagesDownload();
      if (!progress?.job_id) {
        toast.error("Unable to start download");
        return;
      }
      setDownloadProgress(progress);
      setJobIdInQuery(progress.job_id);
      onOpen();
      clearPoll();
      if (!progress.ready && progress.status !== "failed") {
        pollTimerRef.current = setTimeout(
          () => pollJob(progress.job_id),
          POLL_INTERVAL_MS
        );
      }
      toast.success(progress?.message || "Image download started");
    } catch (err) {
      const msg =
        err?.message || "Another bulk download may already be running";
      toast.error(msg);
    } finally {
      setDownloadingStart(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!downloadProgress?.job_id) return;
    setDownloadingFile(true);
    try {
      await product.downloadImagesZipFile(
        downloadProgress.job_id,
        downloadProgress.download_url
      );
      toast.success("ZIP download started");
    } catch (err) {
      toast.error(err?.message || "Unable to download ZIP");
    } finally {
      setDownloadingFile(false);
    }
  };

  const handleCancelJob = async () => {
    const jobId = downloadProgress?.job_id;
    if (!jobId) {
      onClose();
      return;
    }
    const isTerminal =
      downloadProgress?.ready ||
      downloadProgress?.status === "failed" ||
      downloadProgress?.status === "cancelled";
    if (isTerminal) {
      onClose();
      return;
    }
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Cancel this image archive download?");
    if (!confirmed) return;
    setCancelling(true);
    try {
      const progress = await product.cancelImagesDownload(jobId);
      if (progress) setDownloadProgress(progress);
      toast.success("Cancellation requested");
      clearPoll();
      pollTimerRef.current = setTimeout(() => pollJob(jobId), 900);
    } catch (err) {
      toast.error(err?.message || "Unable to cancel download");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    const queryJobId =
      typeof query.jobId === "string" ? query.jobId : query.jobId?.[0];

    const startPollingIfNeeded = (progress) => {
      if (!progress?.job_id) return;
      const isTerminal =
        progress.ready ||
        progress.status === "failed" ||
        progress.status === "cancelled";
      if (!isTerminal) {
        clearPoll();
        pollTimerRef.current = setTimeout(
          () => pollJob(progress.job_id),
          POLL_INTERVAL_MS
        );
      } else {
        const keepReadyFromQuery =
          Boolean(progress.ready) &&
          queryJobId != null &&
          restoredFromQueryJobIdRef.current != null &&
          String(restoredFromQueryJobIdRef.current) === String(progress.job_id) &&
          String(queryJobId) === String(progress.job_id);
        if (!keepReadyFromQuery) {
          clearJobIdFromQuery();
        }
        if (progress.status === "cancelled") {
          setDownloadProgress(null);
          onClose();
        }
      }
    };

    const restoreFromQuery = async (jobId) => {
      try {
        restoredFromQueryJobIdRef.current = String(jobId);
        const progress = await product.getImagesDownloadStatus(jobId);
        if (!progress?.job_id) {
          clearJobIdFromQuery();
          restoredFromQueryJobIdRef.current = null;
          return;
        }
        setDownloadProgress(progress);
        startPollingIfNeeded(progress);
      } catch (_err) {
        if (_err?.status === 404 || _err?.code === 404) {
          setDownloadProgress(null);
          onClose();
        }
        clearJobIdFromQuery();
      }
    };

    const restoreFromActiveJob = async () => {
      try {
        restoredFromQueryJobIdRef.current = null;
        const active = await product.getActiveImagesDownloadJob();
        if (!active?.has_active_job || !active?.job_id) return;
        const progress =
          active.progress && typeof active.progress === "object"
            ? active.progress
            : null;
        if (progress?.job_id) {
          setDownloadProgress(progress);
          setJobIdInQuery(active.job_id);
          startPollingIfNeeded(progress);
          return;
        }
        setJobIdInQuery(active.job_id);
        await restoreFromQuery(active.job_id);
      } catch (_err) {
        // ignore active-job failures and let user start manually
      }
    };

    if (queryJobId) {
      restoreFromQuery(queryJobId);
    } else {
      restoreFromActiveJob();
    }
  }, [
    clearJobIdFromQuery,
    clearPoll,
    onClose,
    pollJob,
    query.jobId,
    router.isReady,
    setJobIdInQuery,
  ]);

  const downloadPercent = toPercent(downloadProgress);
  const hasDownloadJob = Boolean(downloadProgress?.job_id);
  const isDownloadRunning =
    hasDownloadJob &&
    !downloadProgress?.ready &&
    downloadProgress?.status !== "failed";
  const isListingStage =
    isDownloadRunning && downloadProgress?.stage === "listing";
  const miniStatusColor =
    downloadProgress?.status === "failed"
      ? "red"
      : downloadProgress?.ready
        ? "green"
        : "purple";
  const statusMeta = getStatusMeta(downloadProgress);
  const stageLabel = getStageLabel(downloadProgress?.stage);
  const miniSummary = useMemo(() => {
    if (!hasDownloadJob) return "";
    if (downloadProgress?.status === "failed") {
      return `Failed • ${downloadProgress?.message || "Image archive job failed"}`;
    }
    if (downloadProgress?.ready) {
      return `Ready • ${downloadProgress?.total_files || 0} files in archive`;
    }
    if (downloadProgress?.stage === "listing") {
      const listed = Number(downloadProgress?.listed_files || 0);
      const pages = Number(downloadProgress?.scanned_pages || 0);
      return `${stageLabel} • ${listed} files found • ${pages} page${pages === 1 ? "" : "s"} scanned`;
    }
    const downloaded = Number(downloadProgress?.downloaded_files || 0);
    const total = Number(downloadProgress?.total_files || 0);
    return `${stageLabel} • ${downloaded}/${total} files • ${downloadPercent}%`;
  }, [downloadPercent, downloadProgress, hasDownloadJob, stageLabel]);

  const compactProgressLabel = isListingStage
    ? "Downloading..."
    : `Downloading ${downloadPercent}%`;

  const modalMessage = useMemo(() => {
    if (!downloadProgress) return "";
    return downloadProgress.message || "Preparing your image archive...";
  }, [downloadProgress]);

  return (
    <>
      <ImagesArchiveActionButton
        hasDownloadJob={hasDownloadJob}
        isDownloadRunning={isDownloadRunning}
        downloadingStart={downloadingStart}
        downloadPercent={downloadPercent}
        statusMeta={statusMeta}
        miniSummary={miniSummary}
        compactProgressLabel={compactProgressLabel}
        onOpen={onOpen}
        onStart={handleStartImagesDownload}
      />

      <ImagesArchiveProgressModal
        isOpen={isOpen}
        onClose={onClose}
        onCancelJob={handleCancelJob}
        isCancelling={cancelling}
        downloadProgress={downloadProgress}
        statusMeta={statusMeta}
        stageLabel={stageLabel}
        modalMessage={modalMessage}
        isListingStage={isListingStage}
        isDownloadRunning={isDownloadRunning}
        miniStatusColor={miniStatusColor}
        downloadPercent={downloadPercent}
        formatBytes={formatBytes}
        onDownloadZip={handleDownloadZip}
        downloadingFile={downloadingFile}
      />
    </>
  );
}

export default ImagesArchiveDownloadControl;
