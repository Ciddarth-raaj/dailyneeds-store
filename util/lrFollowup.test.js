/**
 * Purchase / LR Follow-up screens - vocabulary, payloads and the card rule.
 *
 *   node --test util/lrFollowup.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const U = require("./lrFollowup");

describe("labels", () => {
  it("uses the agreed status labels", () => {
    assert.equal(U.statusMeta("DISPATCH_PENDING").label, "Dispatch / LR Pending");
    assert.equal(U.statusMeta("IN_TRANSIT").label, "In Transit");
    assert.equal(U.statusMeta("CLOSED").label, "Closed");
    assert.equal(U.statusMeta("VERIFICATION_REQUIRED").label, "Verification Required");
    assert.equal(U.statusMeta("WHATEVER").label, "WHATEVER");
  });

  it("names the source and links to it", () => {
    const adv = { source_type: "ADVANCE_REQUEST", advance_request_id: 1025 };
    const cp = { source_type: "CREDIT_PURCHASE", credit_purchase_id: 4587 };
    assert.equal(U.sourceLabel(adv), "Source: Advance Request AR-1025");
    assert.equal(U.sourceLabel(cp), "Source: Credit Purchase CP-4587");
    assert.equal(U.sourceHref(adv), "/advance-request/view/1025");
    assert.equal(U.sourceHref(cp), "/credit-purchase/4587");
    assert.equal(U.followupRef({ lr_followup_id: 9 }), "LRF-9");
  });

  it("formats dates the Indian way", () => {
    assert.equal(U.formatDate("2026-10-03"), "03/10/2026");
    assert.equal(U.formatDate(null), "-");
    assert.equal(U.ageingLabel(1), "1 day");
    assert.equal(U.ageingLabel(12), "12 days");
  });
});

describe("the transporter dropdown", () => {
  const active = [{ transporter_id: 1, transporter_name: "VRL", contact_no: "9876543210" }];

  it("shows name and contact number", () => {
    assert.deepEqual(U.transporterOptions(active), [{ id: 1, value: "VRL (9876543210)" }]);
  });

  it("keeps an inactive transporter a record already holds, labelled as such", () => {
    const opts = U.transporterOptions(active, {
      transporter_id: 7, transporter_name: "Old Carrier", transporter_contact_no: "9123456789",
    });
    assert.deepEqual(opts[0], { id: 7, value: "Old Carrier (9123456789) — inactive" });
    assert.equal(opts.length, 2);
  });

  it("marks an inactive transporter on display", () => {
    assert.equal(
      U.transporterLabel({ transporter_name: "Old", transporter_contact_no: "9123456789", transporter_is_active: false }),
      "Old (9123456789) — inactive"
    );
  });
});

describe("payloads", () => {
  const current = { lr_no: null, transporter_id: 1, dispatch_date: null, expected_delivery_date: "2026-10-04" };

  it("an LR update sends only what changed, with the request key", () => {
    const p = U.buildLrPayload(current, { lr_no: "LR-786542", transporter_id: 1, dispatch_date: "", expected_delivery_date: "2026-10-04" }, "k1");
    assert.deepEqual(p, { lr_no: "LR-786542", request_key: "k1" });
  });

  it("an LR number may stay empty", () => {
    const p = U.buildLrPayload(current, { lr_no: "", transporter_id: 1, dispatch_date: "2026-09-30", expected_delivery_date: "2026-10-04" }, "k2");
    assert.deepEqual(p, { dispatch_date: "2026-09-30", request_key: "k2" });
  });

  it("nothing changed and no remark sends nothing", () => {
    assert.equal(U.buildLrPayload(current, { transporter_id: 1, expected_delivery_date: "2026-10-04" }, "k"), null);
  });

  it("clearing a field sends it empty, choosing no transporter sends null", () => {
    const p = U.buildLrPayload({ ...current, lr_no: "X" }, { lr_no: "", transporter_id: "", expected_delivery_date: "2026-10-04" }, "k");
    assert.deepEqual(p, { lr_no: "", transporter_id: null, request_key: "k" });
  });

  it("Add Follow-up requires a remark and carries the next date", () => {
    assert.equal(U.buildFollowUpPayload({ remark: " " }, current, "k").error, "Remark is required");
    assert.deepEqual(U.buildFollowUpPayload({ remark: "Called", next_follow_up_date: "2026-10-02" }, current, "k").payload, {
      remark: "Called", next_follow_up_date: "2026-10-02", request_key: "k",
    });
  });
});

describe("the Credit Purchase form", () => {
  const TODAY = "2026-10-01";
  const good = {
    distributor_code: "11", bill_reference: " KF/101 ", amount: "12500", bill_date: "2026-09-29",
    outlet_id: "1", transporter_id: "3",
  };

  it("needs supplier, bill reference, amount, bill date, outlet and transporter", () => {
    const { errors } = U.validateCreditPurchase({}, TODAY);
    assert.deepEqual(Object.keys(errors).sort(), ["amount", "bill_date", "bill_reference", "distributor_code", "outlet_id", "transporter_id"]);
  });

  it("LR No., dispatch and expected delivery are optional", () => {
    const { errors, payload } = U.validateCreditPurchase(good, TODAY);
    assert.deepEqual(errors, {});
    assert.equal(payload.bill_reference, "KF/101");
    assert.equal(payload.transporter_id, 3);
    assert.equal(payload.lr_no, null);
  });

  it("refuses future bill and dispatch dates", () => {
    assert.ok(U.validateCreditPurchase({ ...good, bill_date: "2026-10-02" }, TODAY).errors.bill_date);
    assert.ok(U.validateCreditPurchase({ ...good, dispatch_date: "2026-10-02" }, TODAY).errors.dispatch_date);
  });
});

describe("the read-only card on Advance Request / Credit Purchase", () => {
  it("is not shown before the advance is paid, or without the view key", () => {
    assert.equal(U.cardState({ sourceType: "ADVANCE_REQUEST", sourceStatus: "approved", canView: true }).kind, "hidden");
    assert.equal(U.cardState({ sourceType: "ADVANCE_REQUEST", sourceStatus: "paid", canView: false }).kind, "hidden");
  });

  it("shows the follow-up when there is one", () => {
    const s = U.cardState({ sourceType: "ADVANCE_REQUEST", sourceStatus: "paid", canView: true, response: { followup: { lr_followup_id: 1 } } });
    assert.equal(s.kind, "followup");
  });

  it("surfaces a missing follow-up as an exception, never as nothing", () => {
    const s = U.cardState({
      sourceType: "ADVANCE_REQUEST", sourceStatus: "paid", canView: true,
      response: { expected: true, followup: null, exception: "should have one" },
    });
    assert.deepEqual(s, { kind: "exception", message: "should have one" });
  });
});

describe("the screens", () => {
  const root = path.join(__dirname, "..");
  const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

  it("never offer a way to create a follow-up by hand", () => {
    for (const f of ["pages/lr-followup/index.jsx", "pages/lr-followup/[id].jsx", "pages/credit-purchase/[id].jsx"]) {
      assert.doesNotMatch(read(f), /createFollowup|POST.*\/lr-followup["`]\s*,/);
    }
  });

  it("pick transporters from the master, never as free text", () => {
    for (const f of ["pages/credit-purchase/create.jsx", "components/lrFollowup/FollowupActions.jsx"]) {
      const src = read(f);
      assert.match(src, /TransporterSelect/);
      assert.doesNotMatch(src, /name="transporter"\b/);
    }
  });

  it("every page is gated on its key", () => {
    assert.match(read("pages/lr-followup/index.jsx"), /permissionKey=\{?\[?["']view_lr_followup/);
    assert.match(read("pages/lr-followup/legacy.jsx"), /manage_lr_legacy_verification/);
    assert.match(read("pages/credit-purchase/create.jsx"), /create_credit_purchase/);
    assert.match(read("pages/master/transporters/index.jsx"), /view_transporter_master/);
  });

  it("the Advance Request screen only gains a read-only card", () => {
    const src = read("pages/advance-request/[...params].jsx");
    assert.match(src, /<LrFollowupCard/);
    assert.doesNotMatch(src, /markGoodsReceived|updateLr/);
  });
});
