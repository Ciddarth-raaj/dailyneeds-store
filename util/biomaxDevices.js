/**
 * The Devices screen's vocabulary: how each state is worded and coloured.
 *
 * NO TIMEOUT IS APPLIED HERE. The server decides whether a terminal is
 * Connected, Stale, Offline or Never Seen (utils/biomax_connection.js in
 * the API) and sends the word; this file only chooses how to say it. A
 * second copy of the threshold in the browser is how a screen ends up
 * disagreeing with the API about the same device.
 *
 * ASSIGNMENT AND CONNECTION ARE TWO COLUMNS, NOT ONE. Assignment is what an
 * administrator recorded (an open location period). Connection is what the
 * hardware is doing. "Active" has never meant "working" and this screen
 * stops implying that it does: Active + Offline is the combination somebody
 * has to go and look at, and it can only be seen if both are shown.
 */

const ASSIGNMENT_LABEL = { ACTIVE: "Active", INACTIVE: "Inactive" };
const ASSIGNMENT_COLOR = { ACTIVE: "green", INACTIVE: "gray" };

const CONNECTION_LABEL = {
  CONNECTED: "Connected",
  STALE: "Stale",
  OFFLINE: "Offline",
  NEVER_SEEN: "Never Seen",
};

const CONNECTION_COLOR = {
  CONNECTED: "green",
  STALE: "orange", // amber
  OFFLINE: "red",
  NEVER_SEEN: "gray",
};

const RECEIVER_LABEL = {
  ONLINE: "Online",
  DEGRADED: "Degraded",
  UNAVAILABLE: "Unavailable",
};

const RECEIVER_COLOR = { ONLINE: "green", DEGRADED: "orange", UNAVAILABLE: "gray" };

const assignmentLabel = (status) => ASSIGNMENT_LABEL[status] || "Inactive";
const assignmentColor = (status) => ASSIGNMENT_COLOR[status] || "gray";

/**
 * An unknown or absent connection word reads "Unknown" in grey - never
 * "Offline". A server that did not send the field has told us nothing about
 * the terminal, and saying Offline would be an accusation we cannot support.
 */
const connectionLabel = (status) => CONNECTION_LABEL[status] || "Unknown";
const connectionColor = (status) => CONNECTION_COLOR[status] || "gray";

const receiverLabel = (status) => RECEIVER_LABEL[status] || "Unknown";
const receiverColor = (status) => RECEIVER_COLOR[status] || "gray";

/** "2 minutes ago", for the tooltip beside a Last Seen that is not a clock read. */
function sinceText(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "";
  const s = Math.max(0, Math.floor(Number(seconds)));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * The header line: "Connected: 6 / 7", plus the Stale and Offline tallies.
 * Built from the server's counts; if they are missing the header says so
 * rather than inventing zeroes that would read as "all well".
 */
function healthSummary(data) {
  const receiver = (data && data.receiver) || null;
  const devices = (data && data.devices) || null;
  return {
    receiver_status: receiver ? receiver.status : "UNKNOWN",
    receiver_label: receiverLabel(receiver && receiver.status),
    receiver_color: receiverColor(receiver && receiver.status),
    last_punch_received: (receiver && receiver.last_punch_received) || null,
    counts: devices,
    connected_text: devices ? `${devices.connected} / ${devices.total}` : "-",
  };
}

module.exports = {
  ASSIGNMENT_LABEL,
  CONNECTION_LABEL,
  CONNECTION_COLOR,
  RECEIVER_LABEL,
  assignmentColor,
  assignmentLabel,
  connectionColor,
  connectionLabel,
  healthSummary,
  receiverColor,
  receiverLabel,
  sinceText,
};
