import { useCallback, useEffect, useRef, useState } from "react";
import FilesHelper from "../helper/asset";
import offersV3Talker from "../helper/offersV3Talker";

/**
 * Upload queue for talker photos.
 *
 * In-store signal is unreliable, so a photo is never lost to a failed request:
 * each job retries with backoff and stays in the queue until it lands. The
 * queue is in-memory, so it also guards against closing the tab mid-upload.
 */

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [2000, 4000, 8000, 16000];

let jobSeq = 0;

export function useTalkerUploadQueue({ onResult } = {}) {
  const [jobs, setJobs] = useState([]);
  const runningRef = useRef(false);
  const queueRef = useRef([]);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const patchJob = useCallback((id, patch) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...patch } : job))
    );
  }, []);

  const runJob = useCallback(
    async (job) => {
      patchJob(job.id, { status: "uploading" });

      const uploaded = await FilesHelper.upload(
        job.file,
        job.file.name,
        "offer_talkers"
      );
      // POST /asset resolves { code: 200, remoteUrl } - a non-200 resolves
      // rather than rejecting, so check the code explicitly.
      if (uploaded?.code !== 200 || !uploaded.remoteUrl) {
        throw new Error(uploaded?.msg ?? "Upload did not return a file URL");
      }
      const s3_url = uploaded.remoteUrl;

      patchJob(job.id, { status: "checking", s3_url });

      const result = job.discovery
        ? await offersV3Talker.proofs.submitDiscovery({ ...job.payload, s3_url })
        : await offersV3Talker.proofs.submit({ ...job.payload, s3_url });

      patchJob(job.id, {
        status: "done",
        verdict: result.verdict,
        reason: result.reason,
      });
      if (onResultRef.current) {
        onResultRef.current({ job, result });
      }
    },
    [patchJob]
  );

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    while (queueRef.current.length) {
      const job = queueRef.current[0];
      try {
        await runJob(job);
        queueRef.current.shift();
      } catch (err) {
        const attempts = (job.attempts ?? 0) + 1;
        job.attempts = attempts;
        if (attempts >= MAX_ATTEMPTS) {
          patchJob(job.id, {
            status: "failed",
            reason: err?.message ?? "Upload failed",
          });
          queueRef.current.shift();
        } else {
          // Weak signal: hold the photo and try again rather than losing it.
          patchJob(job.id, { status: "retrying", attempts });
          await new Promise((resolve) =>
            setTimeout(resolve, BACKOFF_MS[attempts - 1] ?? 16000)
          );
        }
      }
    }

    runningRef.current = false;
  }, [runJob, patchJob]);

  const enqueue = useCallback(
    ({ file, payload, discovery = false, label }) => {
      jobSeq += 1;
      const job = {
        id: jobSeq,
        file,
        payload,
        discovery,
        label,
        status: "queued",
        attempts: 0,
      };
      queueRef.current.push(job);
      setJobs((prev) => [...prev, job]);
      drain();
      return job.id;
    },
    [drain]
  );

  const clearFinished = useCallback(() => {
    setJobs((prev) =>
      prev.filter((job) => job.status !== "done" && job.status !== "failed")
    );
  }, []);

  const retryFailed = useCallback(
    (id) => {
      setJobs((prev) => {
        const job = prev.find((j) => j.id === id);
        if (job) {
          job.attempts = 0;
          job.status = "queued";
          queueRef.current.push(job);
          drain();
        }
        return [...prev];
      });
    },
    [drain]
  );

  const pendingCount = jobs.filter(
    (job) => !["done", "failed"].includes(job.status)
  ).length;

  // Don't let a staff member close the tab on top of an unsent photo.
  useEffect(() => {
    if (!pendingCount) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  return { jobs, enqueue, pendingCount, clearFinished, retryFailed };
}
