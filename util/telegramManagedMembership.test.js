/**
 * MANAGED MEMBERSHIP, as the screens read it. Phase 3C.
 *
 *   node --test util/telegramManagedMembership.test.js
 *
 * Pure presentation logic, and two rules that matter more than the wording:
 * a RULE claim is never revocable by hand, and a pending removal is never
 * shown as settled.
 */
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "telegramManagedMembership.js"), "utf8");

/**
 * The module is ESM and this file is CommonJS, so it is loaded the way
 * `util/employeeBulkUpdate.test.mjs` would import it: through a real dynamic
 * import, not a hand-rolled transform. A transform that rewrote `export
 * const` to `exports.` would leave the functions referencing names that no
 * longer exist - which is exactly the kind of test-only breakage that proves
 * nothing about the module.
 */
let mod;
before(async () => {
  mod = await import("./telegramManagedMembership.js");
});

const CLAIM_STATE = { ACTIVE: "ACTIVE", REMOVAL_PENDING: "REMOVAL_PENDING", CLOSED: "CLOSED" };
const CLAIM_SOURCE = { RULE: "RULE", MANUAL: "MANUAL" };

const claim = (over = {}) => ({
  employee_id: 42,
  telegram_group_id: 10,
  source: CLAIM_SOURCE.MANUAL,
  state: CLAIM_STATE.ACTIVE,
  ...over,
});

describe("the chips", () => {
  it("a pending removal is NEVER shown as settled", () => {
    const chip = mod.membershipChip(claim({ state: CLAIM_STATE.REMOVAL_PENDING }));
    assert.equal(chip.label, "Removal pending");
    assert.equal(chip.scheme, "orange");
    assert.match(chip.hint, /removes them/i);
    assert.notEqual(chip.label, mod.membershipChip(claim({ state: CLAIM_STATE.CLOSED })).label);
  });

  it("an active claim reads as managed, in green", () => {
    const chip = mod.membershipChip(claim());
    assert.equal(chip.label, "Managed");
    assert.equal(chip.scheme, "green");
  });

  it("no raw backend word reaches a screen", () => {
    for (const state of Object.values(CLAIM_STATE)) {
      assert.ok(!/_/.test(mod.membershipChip(claim({ state })).label), state);
    }
    for (const src of Object.values(CLAIM_SOURCE)) {
      assert.ok(!/^(RULE|MANUAL)$/.test(mod.sourceChip(claim({ source: src })).label), src);
    }
  });

  it("the source says where it came from, and what it survives", () => {
    assert.match(mod.sourceChip(claim({ source: CLAIM_SOURCE.MANUAL })).hint, /transfer/i);
    assert.match(mod.sourceChip(claim({ source: CLAIM_SOURCE.RULE })).hint, /branch|designation/i);
  });
});

describe("what may be revoked, and by whom", () => {
  it("a MANUAL grant, by somebody who manages Telegram groups", () => {
    assert.equal(mod.canRevoke(claim(), { canManage: true }), true);
  });

  it("A RULE CLAIM IS NEVER REVOCABLE BY HAND", () => {
    // The mapping decides it. A button that quietly did nothing would be
    // worse than no button.
    const rule = claim({ source: CLAIM_SOURCE.RULE });
    assert.equal(mod.canRevoke(rule, { canManage: true }), false);
    assert.match(mod.revokeBlockedReason(rule, { canManage: true }), /mapping/i);
  });

  it("nothing is revocable without the permission", () => {
    assert.equal(mod.canRevoke(claim(), { canManage: false }), false);
    assert.match(mod.revokeBlockedReason(claim(), { canManage: false }), /permission/i);
  });

  it("a removal already pending is not offered twice", () => {
    const pending = claim({ state: CLAIM_STATE.REMOVAL_PENDING });
    assert.equal(mod.canRevoke(pending, { canManage: true }), false);
    assert.match(mod.revokeBlockedReason(pending, { canManage: true }), /already pending/i);
  });
});

describe("the summary sentence", () => {
  it("an empty group explains itself rather than showing a bare zero", () => {
    assert.match(mod.membershipSummary([]), /Nobody is managed/);
    assert.match(mod.membershipSummary([]), /mapping|directly/i);
  });

  it("counts by source, and names anything awaiting removal", () => {
    const text = mod.membershipSummary([
      claim({ source: CLAIM_SOURCE.RULE }),
      claim({ source: CLAIM_SOURCE.RULE, employee_id: 43 }),
      claim({ state: CLAIM_STATE.REMOVAL_PENDING }),
    ]);
    assert.match(text, /3 managed people/);
    assert.match(text, /2 by rule/);
    assert.match(text, /1 added manually/);
    assert.match(text, /1 awaiting removal/);
  });

  it("closed claims are not counted as managed", () => {
    assert.match(mod.membershipSummary([claim({ state: CLAIM_STATE.CLOSED })]), /Nobody is managed/);
  });
});

describe("the screens it feeds", () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

  it("the employee panel offers NO grant or revoke control", () => {
    const panel = read("components/hr/TelegramManagedMembership.jsx");
    assert.ok(!/Button|onGrant|onRevoke|grantTelegram|revokeTelegram/.test(panel));
    assert.match(panel, /getManagedMembership/);
  });

  it("the employee helper cannot write managed membership at all", () => {
    const helper = read("helper/employeeTelegram.js");
    assert.ok(!/grantTelegramGroupMembership|revokeTelegramGroupMembership/.test(helper));
    assert.ok(!/API\.post\(`\/hr\/employee\/\$\{employeeId\}\/telegram\/membership/.test(helper));
  });

  it("the Group Map is where the writes live", () => {
    const helper = read("helper/telegramGroups.js");
    assert.match(helper, /grantTelegramGroupMembership/);
    assert.match(helper, /revokeTelegramGroupMembership/);
  });

  it("no screen shows a chat id or a Telegram user id", () => {
    for (const file of [
      "components/hr/TelegramManagedMembership.jsx",
      "components/master/TelegramGroupManagedMembership.jsx",
      "util/telegramManagedMembership.js",
    ]) {
      assert.ok(!/chat_id|telegram_user_id|invite_link/.test(read(file)), file);
    }
  });
});
