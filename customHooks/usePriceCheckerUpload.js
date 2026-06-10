import { useCallback, useEffect, useRef, useState } from "react";
import priceChecker from "../helper/priceChecker";
import {
  clearStoredPriceCheckerJobId,
  getStoredPriceCheckerJobId,
  setStoredPriceCheckerJobId,
} from "../util/priceCheckerJobStorage";

const POLL_INTERVAL_MS = 1000;

function getStageLabel(stage) {
  if (stage === "queued") return "Queued";
  if (stage === "preparing") return "Preparing upload";
  if (stage === "inserting") return "Inserting rows";
  if (stage === "enriching") return "Enriching product metadata";
  if (stage === "saving") return "Saving upload metadata";
  if (stage === "done") return "Complete";
  if (stage === "failed") return "Failed";
  return "Processing";
}

export function usePriceCheckerUpload({ onComplete, onError } = {}) {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const pollTimerRef = useRef(null);
  const activeJobIdRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const finishJob = useCallback(
    (jobId) => {
      clearPoll();
      activeJobIdRef.current = null;
      if (jobId) {
        clearStoredPriceCheckerJobId();
      }
    },
    [clearPoll]
  );

  const pollJob = useCallback(
    async (jobId) => {
      if (!jobId) return;

      try {
        const progress = await priceChecker.getJobStatus(jobId);

        if (!progress?.job_id) {
          finishJob(jobId);
          setUploadProgress(null);
          setUploading(false);
          await onCompleteRef.current?.({ silent: true });
          return;
        }

        setUploadProgress({
          ...progress,
          stage_label: getStageLabel(progress.stage),
        });

        if (progress.status === "completed") {
          finishJob(jobId);
          setUploading(false);
          await onCompleteRef.current?.({
            inserted: progress.inserted,
            skipped_invalid_rows: progress.skipped_invalid_rows,
            total_rows: progress.total_rows,
          });
          setUploadProgress(null);
          return;
        }

        if (progress.status === "failed") {
          finishJob(jobId);
          setUploading(false);
          setUploadProgress(null);
          onErrorRef.current?.(
            new Error(progress.error || progress.message || "Upload failed")
          );
          return;
        }

        pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
      } catch (err) {
        finishJob(jobId);
        setUploading(false);
        setUploadProgress(null);
        onErrorRef.current?.(err);
      }
    },
    [clearPoll, finishJob]
  );

  const startPolling = useCallback(
    (jobId) => {
      if (!jobId) return;
      activeJobIdRef.current = jobId;
      setStoredPriceCheckerJobId(jobId);
      setUploading(true);
      clearPoll();
      pollJob(jobId);
    },
    [clearPoll, pollJob]
  );

  const startUpload = useCallback(
    async (rows) => {
      setUploading(true);
      setUploadProgress({
        status: "processing",
        stage: "queued",
        stage_label: getStageLabel("queued"),
        processed_rows: 0,
        total_rows: rows.length,
        percent: 0,
        message: "Starting upload",
      });

      const result = await priceChecker.bulkReplace(rows);
      startPolling(result.job_id);
      return result;
    },
    [startPolling]
  );

  useEffect(() => {
    const storedJobId = getStoredPriceCheckerJobId();
    if (storedJobId) {
      activeJobIdRef.current = storedJobId;
      setUploading(true);
      pollJob(storedJobId);
    }

    return () => {
      clearPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    uploading,
    uploadProgress,
    startUpload,
  };
}

export { getStageLabel };
