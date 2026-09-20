/**
 * IST display for machine timestamps, and the two independent device states.
 *
 *   node --test util/biomaxDevices.test.js
 */
const test = require("node:test");
const { describe, it } = test;
const assert = require("node:assert");

const { displayDate, displayDateTime, displayIstDateTime, istDateTimeLocalValue, IST_TIME_ZONE } = require("./displayDate");
const { registerPrefill } = require("./biomaxRegisterPrefill");
const {
  assignmentColor,
  assignmentLabel,
  connectionColor,
  connectionLabel,
  healthSummary,
  receiverLabel,
  sinceText,
} = require("./biomaxDevices");

/** The same instant, formatted by the platform, as an independent check. */
function viaIntl(utc) {
  const [d, t] = utc.split(" ");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(`${d}T${t}Z`));
  const at = (type) => parts.find((p) => p.type === type).value;
  return `${at("day")}/${at("month")}/${at("year")} ${at("hour")}:${at("minute")}:${at("second")}`;
}

describe("UTC machine timestamps are shown in IST", () => {
  it("the regression case: 05:42:11 UTC is 11:12:11 in Puducherry", () => {
    assert.strictEqual(displayIstDateTime("2026-09-20 05:42:11"), "20/09/2026 11:12:11");
  });

  it("a late-evening UTC timestamp rolls into the next IST calendar date", () => {
    assert.strictEqual(displayIstDateTime("2026-09-20 20:00:00"), "21/09/2026 01:30:00");
    assert.strictEqual(displayIstDateTime("2026-12-31 18:30:00"), "01/01/2027 00:00:00");
  });

  it("it agrees with Asia/Kolkata as the platform computes it", () => {
    for (const utc of ["2026-09-20 05:42:11", "2026-09-20 20:00:00", "2026-01-01 00:00:00", "2026-06-15 18:29:59"]) {
      assert.strictEqual(displayIstDateTime(utc), viaIntl(utc), utc);
    }
  });

  it("nothing recorded shows as empty, never as an epoch date", () => {
    for (const empty of [null, undefined, "", 0]) {
      assert.strictEqual(displayIstDateTime(empty), "");
    }
    assert.strictEqual(displayIstDateTime("not a timestamp"), "");
  });

  it("seconds are kept - a terminal seen 40 seconds ago is not shown as a minute", () => {
    assert.strictEqual(displayIstDateTime("2026-09-20 07:04:18"), "20/09/2026 12:34:18");
  });

  it("an ISO 'T' form is read the same as the space form", () => {
    assert.strictEqual(displayIstDateTime("2026-09-20T05:42:11"), "20/09/2026 11:12:11");
  });
});

describe("administrator-entered values are NOT shifted", () => {
  it("displayDateTime still only rearranges - Effective From keeps its time", () => {
    assert.strictEqual(displayDateTime("2026-09-20 05:42:11"), "20/09/2026 05:42:11");
    assert.strictEqual(displayDateTime("2026-09-20 00:00:00"), "20/09/2026 00:00:00");
  });

  it("an Effective To at midnight does not slide to the previous day", () => {
    assert.strictEqual(displayDateTime("2026-09-21 00:00:00"), "21/09/2026 00:00:00");
    assert.strictEqual(displayDate("2026-09-21"), "21/09/2026");
  });

  it("the two helpers disagree by exactly the IST offset, which is the point", () => {
    assert.notStrictEqual(displayDateTime("2026-09-20 05:42:11"), displayIstDateTime("2026-09-20 05:42:11"));
  });
});

describe("the Register prefill keeps the terminal's own wall clock", () => {
  it("io_time is reshaped for datetime-local, not converted", () => {
    assert.strictEqual(registerPrefill("2026-09-20 11:12:11"), "2026-09-20T11:12");
  });

  it("it is not pushed forward by another 5:30", () => {
    assert.notStrictEqual(registerPrefill("2026-09-20 11:12:11"), istDateTimeLocalValue("2026-09-20 11:12:11"));
    assert.strictEqual(istDateTimeLocalValue("2026-09-20 11:12:11"), "2026-09-20T16:42");
  });

  it("a missing or unusable first_punch leaves the field empty rather than invalid", () => {
    assert.strictEqual(registerPrefill(""), "");
    assert.strictEqual(registerPrefill(null), "");
    assert.strictEqual(registerPrefill("2026-09-20"), "");
  });

  it("the value it produces is exactly what datetime-local binds to", () => {
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(registerPrefill("2026-09-20 11:12:11")));
  });
});

describe("assignment and connection are worded and coloured separately", () => {
  it("Active is green, Inactive grey", () => {
    assert.strictEqual(assignmentLabel("ACTIVE"), "Active");
    assert.strictEqual(assignmentColor("ACTIVE"), "green");
    assert.strictEqual(assignmentColor("INACTIVE"), "gray");
  });

  it("Connected green, Stale amber, Offline red, Never Seen grey", () => {
    assert.deepStrictEqual(
      ["CONNECTED", "STALE", "OFFLINE", "NEVER_SEEN"].map((s) => [connectionLabel(s), connectionColor(s)]),
      [["Connected", "green"], ["Stale", "orange"], ["Offline", "red"], ["Never Seen", "gray"]]
    );
  });

  it("an Active device that is Offline keeps both words", () => {
    const row = { status: "ACTIVE", connection_status: "OFFLINE" };
    assert.strictEqual(assignmentLabel(row.status), "Active");
    assert.strictEqual(connectionLabel(row.connection_status), "Offline");
  });

  it("a missing connection word reads Unknown in grey, never Offline", () => {
    assert.strictEqual(connectionLabel(undefined), "Unknown");
    assert.strictEqual(connectionColor(undefined), "gray");
  });

  it("the age hint is human, and absent when the age is", () => {
    assert.strictEqual(sinceText(45), "45s ago");
    assert.strictEqual(sinceText(600), "10m ago");
    assert.strictEqual(sinceText(7200), "2h ago");
    assert.strictEqual(sinceText(null), "");
  });
});

describe("the receiver header", () => {
  it("reads 'Connected: 6 / 7' from the server's counts", () => {
    const got = healthSummary({
      receiver: { status: "ONLINE", ok: true, db: true, last_punch_received: "2026-09-20 05:42:11" },
      devices: { connected: 6, stale: 0, offline: 1, never_seen: 0, total: 7 },
    });
    assert.strictEqual(got.receiver_label, "Online");
    assert.strictEqual(got.connected_text, "6 / 7");
    assert.strictEqual(got.counts.offline, 1);
  });

  it("a failed probe reads Unavailable and produces no counts to misread", () => {
    const got = healthSummary({ receiver: { status: "UNAVAILABLE", ok: false, db: false, last_punch_received: null } });
    assert.strictEqual(got.receiver_label, "Unavailable");
    assert.strictEqual(got.counts, null);
    assert.strictEqual(got.connected_text, "-");
  });

  it("no health payload at all is Unknown, not Offline for everything", () => {
    const got = healthSummary(null);
    assert.strictEqual(got.receiver_label, "Unknown");
    assert.strictEqual(receiverLabel(undefined), "Unknown");
  });
});
