import toast from "react-hot-toast";

/**
 * Show a system (browser) notification from the frontend.
 * Does not call Notification.requestPermission() — user must have granted it (e.g. via the landing banner).
 *
 * @param {Object} payload
 * @param {string} [payload.title] - Defaults to "DailyNeeds"
 * @param {string} [payload.body]
 * @param {string} [payload.url] - Navigates on click (also accepts payload.deep_link)
 * @param {string} [payload.icon]
 * @param {string} [payload.badge]
 * @param {string} [payload.tag] - Dedup / replace; falls back to payload.id
 * @param {string} [payload.id]
 * @param {boolean} [payload.requireInteraction]
 * @param {boolean} [payload.silent]
 * @param {Object} [payload.data]
 * @param {Object} [options]
 * @param {boolean} [options.shouldToastFallback=true] - If no permission or unsupported, show toast
 * @param {string} [options.onClickUrl] - Overrides payload.url / deep_link for click handler
 * @returns {Promise<Notification|null>}
 */
export async function triggerLocalNotification(payload = {}, options = {}) {
  const title = payload?.title || "DailyNeeds";
  const body = payload?.body || "";
  const {
    shouldToastFallback = true,
    onClickUrl = payload?.url || payload?.deep_link,
  } = options;

  const toastMessage = () => {
    if (!shouldToastFallback) return;
    const line = body ? `${title} — ${body}` : title;
    toast(line, { icon: <i className="fa-solid fa-bell" style={{ color: "var(--chakra-colors-purple-500)" }} />, duration: 5000 });
  };

  if (typeof window === "undefined" || !("Notification" in window)) {
    toastMessage();
    return null;
  }

  if (Notification.permission !== "granted") {
    toastMessage();
    return null;
  }

  const notification = new Notification(title, {
    body,
    icon: payload?.icon,
    badge: payload?.badge,
    tag: payload?.tag || payload?.id,
    requireInteraction: Boolean(payload?.requireInteraction),
    silent: Boolean(payload?.silent),
    data: payload?.data || {},
  });

  notification.onclick = () => {
    window.focus();
    if (onClickUrl) {
      window.location.href = onClickUrl;
    }
  };

  return notification;
}
