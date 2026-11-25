/**
 * LR Follow-up screens - vocabulary, payloads and the card rule.
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
    const manual = { source_type: "MANUAL", lr_followup_id: 9, source_ref: null };
    assert.equal(U.sourceLabel(adv), "Source: Advance Request AR-1025");
    assert.equal(U.sourceLabel(manual), "Source: Created manually");
    assert.equal(U.sourceRef(manual), "Manual");
    assert.equal(U.sourceHref(adv), "/advance-request/view/1025");
    assert.equal(U.sourceHref(manual), null);
    assert.equal(U.SOURCE_META.MANUAL.label, "Manual");
    assert.equal(U.SOURCE_META.CREDIT_PURCHASE, undefined);
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

describe("the Create LR Follow-up form", () => {
  const TODAY = "2026-10-01";
  const good = { distributor_code: "11", transporter_id: "3" };

  it("needs only supplier and transporter", () => {
    const { errors } = U.validateManualFollowup({}, TODAY);
    assert.deepEqual(Object.keys(errors).sort(), ["distributor_code", "transporter_id"]);
  });

  it("LR No., dispatch, expected delivery and remarks are optional; no bill, amount or outlet is sent", () => {
    const { errors, payload } = U.validateManualFollowup(good, TODAY);
    assert.deepEqual(errors, {});
    assert.deepEqual(payload, {
      distributor_code: 11, transporter_id: 3, lr_no: null, dispatch_date: null, expected_delivery_date: null, remarks: null,
    });
  });

  it("refuses a future dispatch date, and an expected delivery before dispatch", () => {
    assert.ok(U.validateManualFollowup({ ...good, dispatch_date: "2026-10-02" }, TODAY).errors.dispatch_date);
    assert.ok(
      U.validateManualFollowup({ ...good, dispatch_date: "2026-09-30", expected_delivery_date: "2026-09-29" }, TODAY).errors
        .expected_delivery_date
    );
  });
});

describe("the read-only card on Advance Request", () => {
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

  it("create a follow-up by hand only through Create LR Follow-up", () => {
    const helper = read("helper/lrFollowup.js");
    assert.match(helper, /API\.post\(`\/lr-followup\/manual`/);
    assert.doesNotMatch(helper, /credit-purchase/);
    for (const f of ["pages/lr-followup/index.jsx", "pages/lr-followup/[id].jsx"]) {
      assert.doesNotMatch(read(f), /createManualFollowup/);
    }
    assert.match(read("pages/lr-followup/create.jsx"), /createManualFollowup/);
  });

  it("the Credit Purchase screens and menu entries are gone", () => {
    assert.equal(fs.existsSync(path.join(root, "pages/credit-purchase")), false);
    const menus = read("constants/menus.js");
    assert.doesNotMatch(menus, /Credit Purchase|\/credit-purchase/);
    assert.match(menus, /title: "Create LR Follow-up"/);
    assert.match(menus, /title: "LR Follow-up List \/ Dashboard"/);
    assert.doesNotMatch(read("constants/permissions.js"), /Credit Purchase/);
  });

  it("Create LR Follow-up asks for no bill, amount, bill date or outlet", () => {
    const src = read("pages/lr-followup/create.jsx");
    for (const gone of [/Bill \/ Invoice/, /Amount/, /Receiving Outlet/, /outlet_id/, /useOutlets/]) {
      assert.doesNotMatch(src, gone);
    }
  });

  it("pick transporters from the master, never as free text", () => {
    for (const f of ["pages/lr-followup/create.jsx", "components/lrFollowup/FollowupActions.jsx"]) {
      const src = read(f);
      assert.match(src, /TransporterSelect/);
      assert.doesNotMatch(src, /name="transporter"\b/);
    }
  });

  it("every page is gated on its key", () => {
    assert.match(read("pages/lr-followup/index.jsx"), /permissionKey=\{?\[?["']view_lr_followup/);
    assert.match(read("pages/lr-followup/legacy.jsx"), /manage_lr_legacy_verification/);
    assert.match(read("pages/lr-followup/create.jsx"), /create_credit_purchase/);
    assert.match(read("pages/master/transporters/index.jsx"), /view_transporter_master/);
  });

  it("the Advance Request screen only gains a read-only card", () => {
    const src = read("pages/advance-request/[...params].jsx");
    assert.match(src, /<LrFollowupCard/);
    assert.doesNotMatch(src, /markGoodsReceived|updateLr/);
  });
});

describe("closure outcomes are never confused", () => {
  it("badges a closed follow-up with how it closed", () => {
    assert.deepEqual(U.outcomeMeta({ status: "CLOSED", closure_reason: "GOODS_RECEIVED" }), {
      label: "Closed – Goods Received", colorScheme: "green", stockReceived: true,
    });
    for (const [reason, label] of [["REFUNDED", "Refunded"], ["ADJUSTED", "Adjusted / Settled"], ["CANCELLED", "Cancelled"]]) {
      const m = U.outcomeMeta({ status: "CLOSED", closure_reason: reason });
      assert.equal(m.label, `Closed – ${label}`);
      assert.equal(m.stockReceived, false);
      assert.notEqual(m.colorScheme, "green");
    }
    assert.equal(U.outcomeMeta({ status: "IN_TRANSIT" }).label, "In Transit");
  });

  it("the dashboard can ask for stock received or resolved without receipt", () => {
    assert.deepEqual(U.statusFilterParams("CLOSED:GOODS_RECEIVED"), { status: "CLOSED", closure_reason: "GOODS_RECEIVED" });
    assert.deepEqual(U.statusFilterParams("CLOSED:WITHOUT_RECEIPT"), { status: "CLOSED", closure_reason: "WITHOUT_RECEIPT" });
    assert.deepEqual(U.statusFilterParams("IN_TRANSIT"), { status: "IN_TRANSIT", closure_reason: "" });
    assert.deepEqual(U.statusFilterParams(""), { status: "OPEN", closure_reason: "" });
  });

  it("closing without receipt is behind its own key and endpoint; legacy decisions behind theirs", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "components/lrFollowup/FollowupActions.jsx"), "utf8");
    assert.match(src, /live && canCloseWithoutReceipt/);
    assert.match(src, /legacy && canManage/);
    const helper = fs.readFileSync(path.join(__dirname, "..", "helper/lrFollowup.js"), "utf8");
    assert.match(helper, /\/close-without-receipt/);
    assert.match(helper, /\/legacy-decision/);
    assert.doesNotMatch(helper, /\/resolve`/);
  });

  it("the transporter error says it must come from the master", () => {
    const { errors } = U.validateManualFollowup({ distributor_code: 1 }, "2026-10-01");
    assert.deepEqual(Object.keys(errors), ["transporter_id"]);
    assert.match(errors.transporter_id, /Transporter Master/);
  });
});
