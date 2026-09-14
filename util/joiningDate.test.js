/**
 * "THE JOINING DATE DISAPPEARS WHEN EMPLOYMENT DETAILS ENTERS EDIT MODE."
 *
 *   node --test util/joiningDate.test.js
 *
 * Item 6 of DN-ATTENDANCE-RECALC-DATA-INTEGRITY, reproduced and then pinned.
 *
 * THE REPORT: employee 108 shows a joining date in view mode; clicking Edit
 * leaves the field blank, showing only the `dd-mm-yyyy` placeholder.
 *
 * THE CAUSE: a native `<input type="date">` accepts EXACTLY `YYYY-MM-DD` and
 * renders empty for everything else. `currentPlacement` normalised the value
 * with `String(value).slice(0, 10)`, which is a substring and not a parse, so
 * the legacy `VARCHAR` shape "16 September 2022" became "16 Septemb" - which
 * `displayDate` passes through untouched (view mode looked right) and the
 * date input refuses (edit mode was blank).
 *
 * The first suite below reproduces that exactly, so this file fails against
 * the old implementation rather than merely describing it.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { toIsoDate, toDateInputValue, joiningDateChanged } = require("./joiningDate");
const { currentPlacement } = require("./hrStatus");
const { displayDate } = require("./displayDate");

/** What a native `<input type="date">` will actually show a value for. */
const dateInputAccepts = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value));
/** The behaviour being replaced, so the regression is a comparison. */
const oldNormalisation = (value) => String(value || "").slice(0, 10);

/* ============================================ the bug, reproduced ======== */

describe("employee 108: a joining date the old normalisation destroyed", () => {
  const STORED = "16 September 2022";

  it("THE OLD BEHAVIOUR: view mode looked right and the date input went blank", () => {
    const old = oldNormalisation(STORED);
    assert.equal(old, "16 Septemb", "a substring of a date, not a date");
    assert.equal(displayDate(old), "16 Septemb", "so the read-only field showed it unchanged");
    assert.equal(dateInputAccepts(old), false, "and the edit control rendered empty");
  });

  it("THE FIX: the same value parses, and the date input accepts it", () => {
    assert.equal(toIsoDate(STORED), "2022-09-16");
    assert.equal(dateInputAccepts(toDateInputValue(STORED)), true);
    assert.equal(displayDate(toIsoDate(STORED)), "16/09/2022");
  });

  it("through the card's own read - `currentPlacement`", () => {
    const placement = currentPlacement({ date_of_joining: STORED }, {});
    assert.equal(placement.date_of_joining, "2022-09-16");
    assert.equal(dateInputAccepts(toDateInputValue(placement.date_of_joining)), true);
  });
});

/* =================================== every shape the column ever held ==== */

describe("every shape `date_of_joining` has carried", () => {
  const CASES = [
    // What the API sends now that the column is a real SQL DATE, selected
    // through DATE_FORMAT.
    ["2022-09-16", "2022-09-16", "the migrated ISO value"],
    ["2022-09-16 00:00:00", "2022-09-16", "ISO with the legacy time after it"],
    ["2022-09-16T00:00:00", "2022-09-16", "ISO with a T separator"],
    ["16 September 2022", "2022-09-16", "the Indian long form"],
    ["16 Sep 2022", "2022-09-16", "the abbreviated form a display may produce"],
    ["5 March 2021", "2021-03-05", "a single-digit day"],
    ["16/09/2022", "2022-09-16", "DD/MM/YYYY - day first, as this application writes dates"],
    ["16-09-2022", "2022-09-16", "DD-MM-YYYY"],
  ];

  for (const [input, expected, why] of CASES) {
    it(`reads ${JSON.stringify(input)} as ${expected} (${why})`, () => {
      assert.equal(toIsoDate(input), expected);
      assert.equal(dateInputAccepts(toDateInputValue(input)), true);
    });
  }

  it("a Date object is read by its LOCAL day, not shifted by an offset", () => {
    // The driver builds a DATE column at local midnight; reading it back with
    // UTC getters reports the previous day everywhere east of Greenwich.
    assert.equal(toIsoDate(new Date(2022, 8, 16)), "2022-09-16");
    assert.equal(toIsoDate(new Date(2020, 0, 1)), "2020-01-01");
    assert.equal(toIsoDate(new Date(2019, 11, 31)), "2019-12-31");
  });

  it("no date moves by a day at a month or year boundary", () => {
    assert.equal(toIsoDate("01 January 2020"), "2020-01-01");
    assert.equal(toIsoDate("31 December 2019"), "2019-12-31");
    assert.equal(toIsoDate("29 February 2024"), "2024-02-29");
  });
});

describe("what it refuses rather than guesses", () => {
  for (const bad of [
    null, undefined, "", "   ",
    "dd-mm-yyyy", "not a date", "Sept 2021", "2022", "16 Septemb",
    "2022-02-30", "2023-02-29", "2022-13-01", "32/01/2022",
    new Date("nonsense"),
  ]) {
    it(`returns null for ${JSON.stringify(String(bad))}`, () => {
      assert.equal(toIsoDate(bad), null);
      assert.equal(toDateInputValue(bad), "", "and binds as empty, never as a half-date");
    });
  }
});

/* =================================== Edit -> Save without touching it ==== */

describe("an untouched joining date is preserved exactly", () => {
  const STORED = "2022-09-16";

  it("Edit then Save without touching the field submits NOTHING", () => {
    // The form seeds itself from the stored value, so the two are equal and
    // the correction endpoint is never called.
    const seeded = toDateInputValue(STORED);
    assert.equal(seeded, STORED);
    assert.equal(joiningDateChanged(seeded, STORED), false);
  });

  it("is never submitted as null, undefined or an empty string", () => {
    for (const untouched of [null, undefined, ""]) {
      assert.equal(joiningDateChanged(untouched, STORED), false, "an empty edit is not a correction");
    }
  });

  it("the same date in a different SHAPE is not a change either", () => {
    // The stored value is the legacy long form and the input holds the ISO
    // the form parsed it into: the same day, so nothing is submitted.
    assert.equal(joiningDateChanged("2022-09-16", "16 September 2022"), false);
  });

  it("but a real correction IS submitted, as ISO", () => {
    assert.equal(joiningDateChanged("2022-09-20", STORED), true);
    assert.equal(toDateInputValue("2022-09-20"), "2022-09-20");
  });

  it("and correcting an employee whose stored date was unreadable still works", () => {
    assert.equal(joiningDateChanged("2022-09-16", "not a date"), true);
  });
});

/* ================================== the presentation boundary only ======= */

describe("formatting happens at the point of render and nowhere else", () => {
  it("`displayDate` is a rearrangement of an ISO string, not a parser", () => {
    assert.equal(displayDate("2022-09-16"), "16/09/2022");
    // And what it produces can still be read back, so a value that has been
    // round-tripped through a display is not lost.
    assert.equal(toIsoDate(displayDate("2022-09-16")), "2022-09-16");
  });

  it("a formatted date is never what gets compared or submitted", () => {
    // "16/09/2022" vs "2022-09-16" as strings is a change; as dates it is not.
    assert.notEqual(displayDate("2022-09-16"), "2022-09-16");
    assert.equal(joiningDateChanged(displayDate("2022-09-16"), "2022-09-16"), false);
  });
});
