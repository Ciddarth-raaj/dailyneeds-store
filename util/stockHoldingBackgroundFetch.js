import {
  getLatestStockHoldingReportByDate,
  getStockHoldingReportStatus,
} from "../helper/stockHoldingReport";
import {
  readCachedReport,
  shouldRefreshFromApi,
  writeCachedReport,
} from "./stockHoldingDashboardCache";

const listeners = new Set();
const completionListeners = new Map();

let state = {
  active: false,
  date: null,
  progress: null,
  forceRefresh: false,
  showFloatingIndicator: false,
};

let abortController = null;
let taskGeneration = 0;
let inflightPromise = null;
let inflightDate = null;

function emit() {
  const snapshot = { ...state };
  listeners.forEach((fn) => fn(snapshot));
}

function isAbortError(err) {
  return (
    err?.name === "AbortError" ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}

async function canUseCachedReport(date, cached, { signal } = {}) {
  if (!cached) return false;
  if (shouldRefreshFromApi(cached)) return false;

  try {
    const status = await getStockHoldingReportStatus(date, {
      report_id: cached.stock_holding_report_id ?? null,
      report_created_at: cached.created_at ?? null,
      client_fetched_at: cached.fetchedAt ?? null,
      signal,
    });
    if (signal?.aborted) return false;
    return status?.data?.needs_refresh === false;
  } catch {
    return false;
  }
}

function notifyCompletion(date, payload) {
  const set = completionListeners.get(date);
  if (!set) return;
  set.forEach((fn) => fn(payload));
  completionListeners.delete(date);
}

function addCompletionListener(date, fn) {
  if (!completionListeners.has(date)) {
    completionListeners.set(date, new Set());
  }
  completionListeners.get(date).add(fn);
  return () => completionListeners.get(date)?.delete(fn);
}

async function loadReportInternal(
  date,
  { forceRefresh = false, signal, onProgress }
) {
  if (!forceRefresh) {
    const cached = await readCachedReport(date);
    if (signal.aborted) return { aborted: true };

    let cacheValid = false;
    if (cached && !shouldRefreshFromApi(cached)) {
      cacheValid = await canUseCachedReport(date, cached, { signal });
    }
    if (signal.aborted) return { aborted: true };

    if (cacheValid) {
      return { report: cached, fromCache: true };
    }
  }

  if (signal.aborted) return { aborted: true };

  const response = await getLatestStockHoldingReportByDate(date, {
    signal,
    onProgress: (progress) => {
      if (signal.aborted) return;
      state = { ...state, progress };
      emit();
      onProgress?.(progress);
    },
  });

  if (signal.aborted) return { aborted: true };

  if (response?.code === 404) {
    const emptyReport = { items: [], created_at: null };
    await writeCachedReport(date, emptyReport);
    if (signal.aborted) return { aborted: true };
    return { report: emptyReport, fromCache: false };
  }

  const report = response?.data || {};
  await writeCachedReport(date, report);
  if (signal.aborted) return { aborted: true };
  return { report, fromCache: false };
}

export function subscribeStockHoldingBackgroundFetch(listener) {
  listener({ ...state });
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStockHoldingBackgroundFetchState() {
  return { ...state };
}

export function attachStockHoldingBackgroundFetch() {
  if (!state.active) return;
  state = { ...state, showFloatingIndicator: false };
  emit();
}

export function detachStockHoldingBackgroundFetch() {
  if (!state.active) return;
  state = { ...state, showFloatingIndicator: true };
  emit();
}

export function setStockHoldingBackgroundFetchFloatingIndicator(visible) {
  if (!state.active) return;
  state = { ...state, showFloatingIndicator: visible };
  emit();
}

export function cancelStockHoldingBackgroundFetch() {
  taskGeneration += 1;
  abortController?.abort();
  abortController = null;
  inflightPromise = null;
  inflightDate = null;
  completionListeners.clear();
  state = {
    active: false,
    date: null,
    progress: null,
    forceRefresh: false,
    showFloatingIndicator: false,
  };
  emit();
}

export function startStockHoldingBackgroundFetch(
  date,
  { forceRefresh = false, showFloatingIndicator = false, onComplete, onError } = {}
) {
  if (!date) return Promise.resolve(null);

  const removeCompletionListener = onComplete
    ? addCompletionListener(date, onComplete)
    : null;

  const wrapPromise = (promise) =>
    promise
      .catch((err) => {
        if (!isAbortError(err)) {
          onError?.(err);
        }
        throw err;
      })
      .finally(() => {
        removeCompletionListener?.();
      });

  if (
    !forceRefresh &&
    inflightPromise &&
    inflightDate === date &&
    state.active
  ) {
    if (showFloatingIndicator) {
      state = { ...state, showFloatingIndicator: true };
      emit();
    }
    return wrapPromise(inflightPromise);
  }

  if (inflightPromise) {
    taskGeneration += 1;
    abortController?.abort();
    completionListeners.clear();
  }

  const generation = ++taskGeneration;
  abortController = new AbortController();
  const { signal } = abortController;
  inflightDate = date;

  state = {
    active: true,
    date,
    progress: null,
    forceRefresh,
    showFloatingIndicator,
  };
  emit();

  inflightPromise = (async () => {
    try {
      const result = await loadReportInternal(date, {
        forceRefresh,
        signal,
      });

      if (result?.aborted || generation !== taskGeneration) {
        return null;
      }

      notifyCompletion(date, result);
      return result;
    } finally {
      if (generation === taskGeneration) {
        state = {
          active: false,
          date: null,
          progress: null,
          forceRefresh: false,
          showFloatingIndicator: false,
        };
        emit();
        abortController = null;
        inflightPromise = null;
        inflightDate = null;
      }
    }
  })();

  return wrapPromise(inflightPromise);
}

export function isStockHoldingBackgroundFetchActive(date) {
  return state.active && state.date === date;
}
