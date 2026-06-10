const STORAGE_KEY = "price-checker-job-id";

export function getStoredPriceCheckerJobId() {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? String(value) : null;
  } catch {
    return null;
  }
}

export function setStoredPriceCheckerJobId(jobId) {
  if (typeof window === "undefined" || !jobId) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(jobId));
  } catch {
    // ignore quota / privacy errors
  }
}

export function clearStoredPriceCheckerJobId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
