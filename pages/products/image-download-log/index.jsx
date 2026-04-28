import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@chakra-ui/react";
import toast from "react-hot-toast";
import AgGrid from "../../../components/AgGrid";
import CustomContainer from "../../../components/CustomContainer";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import product from "../../../helper/product";

const POLL_MS = 5000;

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((item) => {
    const status = item?.status || (item?.ready ? "ready" : "in_progress");
    const progress = Number(item?.bytes_percent ?? item?.files_percent ?? 0);
    return {
      ...item,
      status,
      progress_percent: Number.isFinite(progress)
        ? Math.max(0, Math.min(100, Math.round(progress)))
        : 0,
    };
  });
}

function getStatusBadge(status) {
  if (status === "ready") return { label: "Ready", colorScheme: "green" };
  if (status === "failed") return { label: "Failed", colorScheme: "red" };
  if (status === "cancelled")
    return { label: "Cancelled", colorScheme: "orange" };
  if (status === "listing") return { label: "Listing", colorScheme: "yellow" };
  return { label: "In Progress", colorScheme: "purple" };
}

export default function ImageDownloadLogPage() {
  const [rows, setRows] = useState([]);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchLogs = useCallback(
    async (silent = false) => {
      try {
        const data = await product.listImagesDownloadJobs();
        setRows(normalizeRows(data));
      } catch (err) {
        if (!silent) {
          toast.error(err?.message || "Failed to load image download logs");
        }
      } finally {
        clearTimer();
        timerRef.current = setTimeout(() => fetchLogs(true), POLL_MS);
      }
    },
    [clearTimer]
  );

  useEffect(() => {
    fetchLogs(false);
    return () => clearTimer();
  }, [clearTimer, fetchLogs]);

  const handleDownload = useCallback(async (row) => {
    if (!row?.job_id || !row?.download_url) return;
    try {
      await product.downloadImagesZipFile(row.job_id, row.download_url);
      toast.success("ZIP download started");
    } catch (err) {
      toast.error(err?.message || "Unable to download ZIP");
    }
  }, []);

  const colDefs = useMemo(
    () => [
      {
        field: "zip_name",
        headerName: "ZIP Name",
        flex: 2,
        valueGetter: (params) =>
          params.data?.zip_name ||
          params.data?.file_name ||
          `job-${params.data?.job_id || "-"}.zip`,
      },
      {
        field: "total_files",
        headerName: "Item Count",
        type: "number",
        valueGetter: (params) => Number(params.data?.total_files || 0),
      },
      {
        field: "downloaded_files",
        headerName: "Files Downloaded",
        type: "number",
        valueGetter: (params) => Number(params.data?.downloaded_files || 0),
      },
      {
        field: "progress_percent",
        headerName: "Progress",
        valueGetter: (params) =>
          `${Number(params.data?.progress_percent || 0)}%`,
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) => getStatusBadge(params.data?.status),
      },
      {
        field: "download_action",
        headerName: "Download",
        filter: false,
        type: "action-icons",
        valueGetter: (params) => {
          const canDownload =
            params.data?.status === "ready" &&
            Boolean(params.data?.download_url);
          return [
            {
              label: "Download ZIP",
              icon: "fa-solid fa-download",
              disabled: !canDownload,
              onClick: () => handleDownload(params.data),
            },
          ];
        },
      },
    ],
    [handleDownload]
  );

  return (
    <GlobalWrapper
      title="Image Download Log"
      permissionKey="view_images_download_log"
    >
      <CustomContainer title="Image Download Log" filledHeader>
        <AgGrid
          rowData={rows}
          colDefs={colDefs}
          tableKey="image-download-log"
          gridOptions={{
            getRowId: (params) => String(params.data?.job_id || ""),
          }}
          emptyOverlayText="No image download jobs found"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}
