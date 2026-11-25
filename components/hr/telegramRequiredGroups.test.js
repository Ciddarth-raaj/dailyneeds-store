/**
 * Required Telegram groups - the Phase 3B screen. 
 *
 *   node --test components/hr/telegramRequiredGroups.test.js
 *
 * Two halves, as the other HR Telegram tests split them: the RULES in
 * util/employeeTelegramGroups.js are executed, and the SCREENS are read as
 * source because no component renderer is wired up in this repo.
 *
 * What is defended in the source half is the approved shape - and above all
 * that NO Remove / Leave / Kick control exists anywhere, because Phase 3B
 * invites and verifies and takes nobody out of a group.
 */
const test = require("node:test");
const { describe, it } = test;
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const groupsPanel = strip(read("components/hr/TelegramRequiredGroups.jsx"));
const setupPanel = strip(read("components/hr/TelegramSetupPanel.jsx"));
const profileSection = strip(read("components/hr/profile/TelegramSection.jsx"));
const onboarding = strip(read("pages/hr/employees/new.jsx"));
const helper = strip(read("helper/employeeTelegram.js"));
const hook = strip(read("customHooks/useEmployeeTelegramGroups.js"));

const rules = (() => {
  // The module imports the Phase 2 label helpers; inline the real ones so
  // the fallback path is exercised against the actual wording rather than a
  // stand-in that could drift from it.
  const phase2 = read("util/employeeTelegram.js")
    .replace(/export const /g, "const ")
    .replace(/export function /g, "function ")
    .replace(/export \{[\s\S]*?\};/g, "")
    .replace(/module\.exports[\s\S]*?;/g, "");
  const cjs =
    phase2 +
    "\n" +
    read("util/employeeTelegramGroups.js")
      .replace(/^import[^\n]*\n/gm, "")
      .replace(/export const /g, "const ")
      .replace(/export function /g, "function ");
  const names = [
    "MEMBERSHIP_STATUS",
    "MEMBERSHIP_LABEL",
    "GROUP_READINESS",
    "READINESS_FALLBACK",
    "GROUP_MESSAGES",
    "membershipLabel",
    "membershipColor",
    "readinessReason",
    "canJoin",
    "isPending",
    "isJoined",
    "isNotReady",
    "telegramComplete",
    "groupProgress",
    "progressSummary",
    "shouldPollGroups",
    "TELEGRAM_COMPLETION",
    "COMPLETION_LABEL",
    "COMPLETION_SCHEME",
    "COMPLETION_HINT",
    "completionLabel",
    "completionScheme",
    "completionHint",
    "hasCompletion",
    "telegramQueueBadge",
  ];
  // eslint-disable-next-line no-new-func
  return new Function(`${cjs}\nreturn { ${names.join(", ")} };`)();
})();

const group = (status, over = {}) => ({
  telegram_group_id: 1,
  group_name: "ECR Team",
  membership_status: status,
  readiness_status: status === "GROUP_NOT_READY" ? "BOT_NOT_ADMIN" : "READY",
  ...over,
});

/* ================================================================ rules */

describe("the four membership states", () => {
  it("each has a human label, and none is a raw enum", () => {
    assert.strictEqual(rules.membershipLabel("JOINED"), "Joined");
    assert.strictEqual(rules.membershipLabel("JOIN_PENDING"), "Join Pending");
    assert.strictEqual(rules.membershipLabel("ACTION_REQUIRED"), "Action Required");
    assert.strictEqual(rules.membershipLabel("GROUP_NOT_READY"), "Group Not Ready");
    for (const label of Object.values(rules.MEMBERSHIP_LABEL)) {
      assert.ok(!/_/.test(label), `"${label}" reads like an enum`);
    }
  });

  it("an unknown state degrades to Unknown rather than showing the code", () => {
    assert.strictEqual(rules.membershipLabel("SOMETHING_NEW"), "Unknown");
    assert.strictEqual(rules.membershipColor("SOMETHING_NEW"), "gray");
  });

  it("offers Join ONLY where there is something to do", () => {
    assert.strictEqual(rules.canJoin(group("ACTION_REQUIRED")), true);
    assert.strictEqual(rules.canJoin(group("JOINED")), false);
    assert.strictEqual(rules.canJoin(group("JOIN_PENDING")), false);
    // A button that always fails is worse than no button.
    assert.strictEqual(rules.canJoin(group("GROUP_NOT_READY")), false);
    assert.strictEqual(rules.canJoin(null), false);
  });
});

describe("the readiness reason", () => {
  it("prefers the server's own sentence", () => {
    assert.strictEqual(
      rules.readinessReason({ readiness_status: "BOT_NOT_ADMIN", readiness_reason: "Server said this" }),
      "Server said this"
    );
  });

  it("falls back to a human sentence, never a raw enum", () => {
    for (const [status, expected] of Object.entries(rules.READINESS_FALLBACK)) {
      const reason = rules.readinessReason({ readiness_status: status });
      assert.strictEqual(reason, expected);
      assert.ok(!/^[A-Z_]+$/.test(reason), `"${reason}" is an enum, not a sentence`);
    }
  });

  it("names every non-ready status the backend can send", () => {
    for (const status of Object.values(rules.GROUP_READINESS)) {
      if (status === "READY") continue;
      assert.ok(rules.READINESS_FALLBACK[status], `no wording for ${status}`);
    }
  });

  it("is null for a ready group - an empty warning row reads as a fault", () => {
    assert.strictEqual(rules.readinessReason({ readiness_status: "READY" }), null);
    assert.strictEqual(rules.readinessReason({}), null);
    assert.strictEqual(rules.readinessReason(null), null);
  });
});

describe("Telegram Complete", () => {
  it("uses the server's answer when it sends one", () => {
    assert.strictEqual(
      rules.telegramComplete({ connected: true, telegram_complete: true, groups: [group("JOIN_PENDING")] }),
      true
    );
    assert.strictEqual(
      rules.telegramComplete({ connected: true, telegram_complete: false, groups: [group("JOINED")] }),
      false
    );
  });

  it("derives the SAME rule for an older response", () => {
    assert.strictEqual(rules.telegramComplete({ connected: true, groups: [group("JOINED")] }), true);
    assert.strictEqual(rules.telegramComplete({ connected: true, groups: [group("JOIN_PENDING")] }), false);
    assert.strictEqual(rules.telegramComplete({ connected: true, groups: [group("ACTION_REQUIRED")] }), false);
  });

  it("ZERO required groups is complete", () => {
    assert.strictEqual(rules.telegramComplete({ connected: true, groups: [] }), true);
  });

  it("a group that is NOT READY keeps it incomplete", () => {
    // Not the employee's fault, but the requirement is genuinely unmet and a
    // green tick would hide the group that needs fixing.
    assert.strictEqual(
      rules.telegramComplete({ connected: true, groups: [group("JOINED"), group("GROUP_NOT_READY")] }),
      false
    );
  });

  it("a DISCONNECTED employee is never complete, whatever the list says", () => {
    assert.strictEqual(
      rules.telegramComplete({ connected: false, telegram_complete: true, groups: [group("JOINED")] }),
      false
    );
    assert.strictEqual(rules.telegramComplete({ connected: false, groups: [] }), false);
    assert.strictEqual(rules.telegramComplete(null), false);
  });
});

describe("the progress line", () => {
  it("counts joined against required", () => {
    const payload = { groups: [group("JOINED"), group("JOINED"), group("ACTION_REQUIRED")] };
    assert.deepStrictEqual(rules.groupProgress(payload), { joined: 2, total: 3 });
    assert.match(rules.progressSummary(payload), /2 of 3 required groups joined/);
  });

  it("reads correctly for one group", () => {
    assert.match(rules.progressSummary({ groups: [group("JOINED")] }), /1 of 1 required group joined/);
  });

  it("says there is nothing to join rather than '0 of 0'", () => {
    assert.strictEqual(rules.progressSummary({ groups: [] }), rules.GROUP_MESSAGES.NONE_REQUIRED);
    assert.match(rules.GROUP_MESSAGES.NONE_REQUIRED, /nothing to join/);
  });
});

describe("polling", () => {
  it("polls only while a join is actually in flight", () => {
    assert.strictEqual(
      rules.shouldPollGroups({ connected: true, groups: [group("JOIN_PENDING")] }),
      true
    );
  });

  it("STOPS once nothing is pending - each poll costs Telegram calls", () => {
    assert.strictEqual(rules.shouldPollGroups({ connected: true, groups: [group("JOINED")] }), false);
    assert.strictEqual(
      rules.shouldPollGroups({ connected: true, groups: [group("ACTION_REQUIRED")] }),
      false
    );
    assert.strictEqual(
      rules.shouldPollGroups({ connected: true, groups: [group("GROUP_NOT_READY")] }),
      false
    );
    assert.strictEqual(rules.shouldPollGroups({ connected: true, groups: [] }), false);
  });

  it("never polls for a disconnected employee", () => {
    assert.strictEqual(
      rules.shouldPollGroups({ connected: false, groups: [group("JOIN_PENDING")] }),
      false
    );
    assert.strictEqual(rules.shouldPollGroups(null), false);
  });
});

/* ============================================================== screens */

describe("the required-groups panel", () => {
  it("renders each of the four states", () => {
    assert.match(groupsPanel, /membershipLabel\(group\.membership_status\)/);
    assert.match(groupsPanel, /canJoin\(group\) &&/);
    assert.match(groupsPanel, /isPending\(group\) &&/);
    assert.match(groupsPanel, /isNotReady\(group\)/);
  });

  it("shows the readiness reason in words and NO Join button", () => {
    assert.match(groupsPanel, /readinessReason\(group\)/);
    // Join is gated on canJoin, which is false for a not-ready group.
    assert.ok(!/GROUP_NOT_READY[\s\S]{0,200}<Button[^>]*>\s*Join/.test(groupsPanel));
  });

  it("offers a NEW LINK for a pending or expired attempt", () => {
    assert.match(groupsPanel, /New link/);
    assert.match(groupsPanel, /handleJoin\(group\)/);
  });

  it("shows Telegram Complete from the shared rule", () => {
    assert.match(groupsPanel, /telegramComplete\(data\)/);
    assert.match(groupsPanel, /GROUP_MESSAGES\.COMPLETE/);
    assert.match(groupsPanel, /GROUP_MESSAGES\.INCOMPLETE/);
  });

  it("says there is nothing to join when zero groups are required", () => {
    assert.match(groupsPanel, /groups\.length === 0/);
    assert.match(groupsPanel, /GROUP_MESSAGES\.NONE_REQUIRED/);
  });

  it("tells the manager the link is for the employee's own phone", () => {
    assert.match(rules.GROUP_MESSAGES.LINK_READY, /employee's Telegram account/);
    assert.match(rules.GROUP_MESSAGES.LINK_READY, /15 minutes/);
    assert.match(rules.GROUP_MESSAGES.LINK_READY, /only for them/);
  });

  it("holds the invite link in component state and never stores it", () => {
    assert.match(groupsPanel, /const \[links, setLinks\] = useState\(\{\}\)/);
    assert.ok(!/localStorage|sessionStorage/.test(groupsPanel));
  });
});

describe("integration with the existing flows", () => {
  it("is rendered INSIDE the shared Telegram panel, not as a fourth wizard stage", () => {
    assert.match(setupPanel, /import TelegramRequiredGroups/);
    assert.match(setupPanel, /<TelegramRequiredGroups\s+employeeId=\{employeeId\}/);
  });

  it("appears only once the identity is connected", () => {
    // The GUARD is what matters, not the exact shape of the block: Phase 3C
    // put its read-only managed-membership list beside this one inside the
    // same `connected && !reconnecting` fragment, which is correct - there is
    // nothing to say about managed groups for somebody with no identity
    // either. The panel has more than one such guard, so the one wrapping
    // this component is found by walking back from the component itself.
    const at = setupPanel.indexOf("<TelegramRequiredGroups");
    assert.notEqual(at, -1);
    const before = setupPanel.slice(0, at);
    const guardAt = before.lastIndexOf("{connected && !reconnecting && (");
    assert.notEqual(guardAt, -1, "required groups must sit inside the connected guard");
    // Nothing closes the guard between it and the component.
    assert.ok(!/\)\}/.test(setupPanel.slice(guardAt, at)));
  });

  it("and so does Phase 3C's read-only managed-membership list", () => {
    const at = setupPanel.indexOf("<TelegramManagedMembership");
    assert.notEqual(at, -1);
    const guardAt = setupPanel.slice(0, at).lastIndexOf("{connected && !reconnecting && (");
    assert.notEqual(guardAt, -1);
    assert.ok(!/\)\}/.test(setupPanel.slice(guardAt, at)));
  });

  it("reaches the onboarding wizard through that same panel", () => {
    assert.match(onboarding, /<TelegramSetupPanel/);
    // No new stage was added to the manager wizard.
    assert.ok(!/RequiredGroups/.test(onboarding), "it arrives inside the Telegram stage");
  });

  it("reaches Employee Master through that same panel", () => {
    assert.match(profileSection, /<TelegramSetupPanel/);
    assert.ok(
      !/RequiredGroups/.test(profileSection),
      "an existing connected employee needs no separate screen"
    );
  });

  it("keeps Skip for now & Finish available in onboarding", () => {
    assert.match(onboarding, /Skip for now/);
  });
});

describe("the API the panel calls", () => {
  it("is the two Phase 3B endpoints and nothing invented", () => {
    assert.match(helper, /getGroups:/);
    assert.match(helper, /createJoinLink:/);
    assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/telegram\/groups/);
    assert.match(
      helper,
      /\/hr\/employee\/\$\{employeeId\}\/telegram\/groups\/\$\{telegramGroupId\}\/join-link/
    );
  });

  it("sends an EMPTY body for the join link", () => {
    const fn = helper.slice(helper.indexOf("createJoinLink"));
    assert.match(fn, /join-link`,\s*\{\}/);
  });

  it("stops polling when nothing is pending", () => {
    assert.match(hook, /shouldPollGroups\(data\)/);
    assert.match(hook, /if \(!polling \|\| !enabled\) return undefined/);
  });

  it("lets only the newest response write state", () => {
    assert.match(hook, /ticket !== sequence\.current/);
  });
});

describe("NO MEMBERSHIP REMOVAL EXISTS IN THE 3A/3B UI", () => {
  const screens = {
    "TelegramRequiredGroups.jsx": read("components/hr/TelegramRequiredGroups.jsx"),
    "TelegramSetupPanel.jsx": read("components/hr/TelegramSetupPanel.jsx"),
    "useEmployeeTelegramGroups.js": read("customHooks/useEmployeeTelegramGroups.js"),
    "util/employeeTelegramGroups.js": read("util/employeeTelegramGroups.js"),
    "helper/employeeTelegram.js": read("helper/employeeTelegram.js"),
  };

  it("offers no Remove, Leave, Kick, Ban or Sync control", () => {
    // Comments stripped, JSX text kept: a button's label is text, while
    // these files' headers describe the absence in prose.
    for (const [name, raw] of Object.entries(screens)) {
      const source = strip(raw);
      for (const label of [
        "Remove from Group",
        "Remove Member",
        "Leave Group",
        "Kick",
        "Ban",
        "Sync Members",
        "Reconcile",
      ]) {
        assert.ok(
          !new RegExp(label.replace(/ /g, "\\s*"), "i").test(source),
          `${name} must not offer "${label}"`
        );
      }
    }
  });

  it("calls no removal endpoint", () => {
    const calls = [...strip(read("helper/employeeTelegram.js")).matchAll(/API\.(get|post|put|delete)\(`([^`]*)`/g)];
    for (const [, method, url] of calls) {
      assert.ok(!/leave|remove|kick|ban|reconcile/i.test(url), `unexpected call ${method} ${url}`);
    }
  });

  it("shows no Telegram identifier, in any Phase 3B file", () => {
    // Scoped to what this phase added. `TelegramSetupPanel` legitimately
    // talks ABOUT a mobile - it is the Phase 2 MOBILE_MISMATCH wording and
    // the Edit mobile action - while never rendering a NUMBER, which is the
    // property that actually matters and is asserted separately below.
    const phase3b = {
      "TelegramRequiredGroups.jsx": screens["TelegramRequiredGroups.jsx"],
      "useEmployeeTelegramGroups.js": screens["useEmployeeTelegramGroups.js"],
      "util/employeeTelegramGroups.js": screens["util/employeeTelegramGroups.js"],
      "helper/employeeTelegram.js": screens["helper/employeeTelegram.js"],
    };
    for (const [name, raw] of Object.entries(phase3b)) {
      const source = strip(raw);
      for (const forbidden of [
        "telegram_user_id",
        "private_chat_id",
        "chat_id",
        "primary_contact_number",
        "aadhaar",
        "salary",
        "invite_link_hash",
      ]) {
        assert.ok(
          !new RegExp(forbidden, "i").test(source),
          `${name} must not reference ${forbidden}`
        );
      }
    }
  });

  it("renders no mobile number anywhere on the Telegram stage", () => {
    // The panel may SAY a mobile does not match; it may not PRINT one.
    for (const [name, raw] of Object.entries(screens)) {
      const source = strip(raw);
      const printed = source.match(/\{[^}]*\b(mobile|contact_number|phone)\w*\s*\}/gi) || [];
      assert.deepStrictEqual(printed, [], `${name} renders a mobile value: ${printed.join(", ")}`);
    }
  });
});


/* =============================================== dashboard completion */

describe("the dashboard completion column", () => {
  const queue = strip(read("pages/hr/onboarding/index.jsx"));

  it("has a word for each of the four states, and none is an enum", () => {
    assert.deepStrictEqual(Object.keys(rules.COMPLETION_LABEL).sort(), [
      "COMPLETE",
      "NOT_CONNECTED",
      "PENDING",
      "VERIFICATION_PENDING",
    ]);
    for (const label of Object.values(rules.COMPLETION_LABEL)) {
      assert.ok(!/_/.test(label), `"${label}" reads like an enum`);
    }
  });

  it("says NOT CHECKED rather than Pending for an unverified group", () => {
    // Different job for whoever works the queue: Pending means the employee
    // must join something, Not Checked means nobody has looked since a
    // mapping changed or they reconnected. Merging them sends somebody
    // chasing an employee who may already be finished.
    assert.strictEqual(rules.completionLabel("VERIFICATION_PENDING"), "Not Checked");
    assert.strictEqual(rules.completionLabel("PENDING"), "Groups Pending");
    assert.notStrictEqual(
      rules.completionLabel("VERIFICATION_PENDING"),
      rules.completionLabel("PENDING")
    );
  });

  it("colours Complete and the two unfinished states differently", () => {
    assert.strictEqual(rules.completionScheme("COMPLETE"), "green");
    assert.notStrictEqual(rules.completionScheme("PENDING"), "green");
    assert.notStrictEqual(rules.completionScheme("VERIFICATION_PENDING"), "green");
    assert.notStrictEqual(rules.completionScheme("NOT_CONNECTED"), "green");
  });

  it("the tooltip says the status is LAST-VERIFIED, not live", () => {
    assert.match(rules.completionHint("COMPLETE"), /last checked/i);
    assert.match(rules.completionHint("PENDING"), /last checked/i);
    assert.match(rules.completionHint("VERIFICATION_PENDING"), /not been checked/i);
    assert.match(rules.completionHint("VERIFICATION_PENDING"), /Open the employee/i);
  });

  it("renders the completion badge through the shared helper", () => {
    // The desktop cell no longer builds the badge itself - it and the mobile
    // card both ask `telegramQueueBadge`, which is what stops them drifting.
    assert.match(queue, /telegramQueueBadge\(row\)/);
    assert.match(queue, /badge\.colorScheme/);
    assert.match(queue, /badge\.label/);
    assert.match(queue, /badge\.hint \? <Tooltip/);
  });

  it("FALLS BACK to the old label when the field is absent", () => {
    // An older response, or a server without the cache wired. A missing
    // field must not render blank, and certainly not as Not Connected.
    assert.strictEqual(rules.hasCompletion({}), false);
    assert.strictEqual(rules.hasCompletion({ telegram_completion: "SOMETHING_NEW" }), false);
    assert.strictEqual(rules.hasCompletion(null), false);
    assert.strictEqual(rules.hasCompletion({ telegram_completion: "COMPLETE" }), true);
    // The fallback now lives in the shared helper, where BOTH views get it,
    // rather than in one view's JSX - asserted against behaviour below.
    assert.strictEqual(rules.telegramQueueBadge({}).fromCompletion, false);
  });

  it("makes NO per-row request - the column comes from the bulk summary", () => {
    assert.ok(
      !/\/telegram\/groups/.test(queue),
      "the list must never call the per-employee Telegram endpoint"
    );
    assert.ok(!/employeeTelegram\./.test(queue), "no per-row Telegram helper call");
  });
});


/* ============================ desktop and mobile must not disagree ======= */

describe("the Telegram chip is ONE function for both views", () => {
  const card = strip(read("components/hr/OnboardingQueueCard.jsx"));
  const queue = strip(read("pages/hr/onboarding/index.jsx"));

  it("renders every completion state with the same label and colour", () => {
    for (const status of ["COMPLETE", "PENDING", "VERIFICATION_PENDING", "NOT_CONNECTED"]) {
      const badge = rules.telegramQueueBadge({ telegram_completion: status });
      assert.strictEqual(badge.label, rules.completionLabel(status), status);
      assert.strictEqual(badge.colorScheme, rules.completionScheme(status), status);
      assert.strictEqual(badge.fromCompletion, true);
    }
  });

  it("shows the four approved words", () => {
    const labels = ["COMPLETE", "PENDING", "VERIFICATION_PENDING", "NOT_CONNECTED"].map(
      (s) => rules.telegramQueueBadge({ telegram_completion: s }).label
    );
    assert.deepStrictEqual(labels, ["Complete", "Groups Pending", "Not Checked", "Not Connected"]);
  });

  it("FALLS BACK to the Phase 2 label when completion is absent or unknown", () => {
    for (const row of [
      {},
      { telegram_completion: "SOMETHING_NEW" },
      { telegram_completion: null },
      { telegram_status: "CONNECTED" },
    ]) {
      const badge = rules.telegramQueueBadge(row);
      assert.strictEqual(badge.fromCompletion, false);
      assert.ok(badge.label, "a missing field must never render blank");
      assert.notStrictEqual(badge.label, "Not Connected", "a connected employee must not be mislabelled");
    }
  });

  it("survives a null row without throwing", () => {
    const badge = rules.telegramQueueBadge(null);
    assert.ok(badge.label);
    assert.strictEqual(badge.fromCompletion, false);
  });

  it("BOTH views call it, and NEITHER decides anything itself", () => {
    assert.match(card, /telegramQueueBadge\(row\)/);
    assert.match(queue, /telegramQueueBadge\(row\)/);
    // Neither view may reach past it to the raw field or the label tables.
    for (const [name, source] of Object.entries({ card, queue })) {
      assert.ok(
        !/completionLabel\(|completionScheme\(/.test(source),
        `${name} must not build the badge itself - that is how the two drift`
      );
    }
  });

  it("the mobile card shows a Telegram chip at all", () => {
    assert.match(card, /Telegram: \{telegram\.label\}/);
  });

  it("the mobile card does NOT flatten Telegram through statusBadge", () => {
    // statusBadge is tri-state; Telegram has four, and the fourth - Not
    // Checked - is the one the queue most needs.
    assert.ok(!/statusBadge\(\s*row\.telegram/.test(card));
  });
});
