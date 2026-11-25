/**
 * Bulk approval selection — what may be ticked, and what ticking it means.
 *
 *   node --test util/salaryApprovalSelection.test.js
 *
 * The rule that matters here is that selectable is exactly approvable: the
 * approver's permission AND the server's `own_proposal` flag. A checkbox on a
 * row the server would refuse is how a batch fails in full for a reason nobody
 * can see on the screen.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  selectableSalaryIds,
  toggleSelection,
  pruneSelection,
  isAllSelected,
  nextSelectAll,
  confirmationMessage,
  successMessage,
} = require("./salaryApprovalSelection");

const APPROVER = {
  permissions: [{ permission_key: "view_employees" }, { permission_key: "approve_salary_revision" }],
  isAdmin: false,
};
const READER = { permissions: [{ permission_key: "view_employees" }], isAdmin: false };
const ADMIN = { permissions: [], isAdmin: true };

const item = (salary_id, own_proposal = false) => ({ salary_id, own_proposal });

test.describe("what is selectable", () => {
  test.it("every displayed proposal, for an approver who raised none of them", () => {
    assert.deepEqual(selectableSalaryIds([item(1), item(2), item(3)], APPROVER), [1, 2, 3]);
  });

  test.it("NEVER a proposal the actor raised themselves", () => {
    // The self-approval rule is the server's and applies to the batch record by
    // record; offering the checkbox would only produce a batch it refuses whole.
    assert.deepEqual(selectableSalaryIds([item(1), item(2, true), item(3)], APPROVER), [1, 3]);
  });

  test.it("an administrator's own proposal IS selectable — the standing exception", () => {
    // `own_proposal` already honours the admin exception on the server, so it
    // arrives false for them and nothing here has to know about it.
    assert.deepEqual(selectableSalaryIds([item(1), item(2)], ADMIN), [1, 2]);
  });

  test.it("nothing at all without the approver permission", () => {
    assert.deepEqual(selectableSalaryIds([item(1), item(2)], READER), []);
  });

  test.it("survives an empty or missing queue", () => {
    assert.deepEqual(selectableSalaryIds([], APPROVER), []);
    assert.deepEqual(selectableSalaryIds(undefined, APPROVER), []);
  });

  test.it("is the DISPLAYED rows only — the filtered list is what it is given", () => {
    // The server applies the filters; `items` is the answer, so Select All can
    // only ever tick rows the approver is actually looking at.
    const displayed = [item(4), item(5)];
    assert.deepEqual(selectableSalaryIds(displayed, APPROVER), [4, 5]);
  });
});

test.describe("ticking and unticking", () => {
  test.it("adds and removes", () => {
    assert.deepEqual(toggleSelection([], 1, true), [1]);
    assert.deepEqual(toggleSelection([1, 2], 1, false), [2]);
  });

  test.it("ticking twice is still one selection", () => {
    assert.deepEqual(toggleSelection([1], 1, true), [1]);
  });

  test.it("unticking something never selected changes nothing", () => {
    assert.deepEqual(toggleSelection([1], 2, false), [1]);
  });
});

test.describe("Select All", () => {
  test.it("selects every eligible row, then clears", () => {
    assert.deepEqual(nextSelectAll([1, 2, 3], []), [1, 2, 3]);
    assert.deepEqual(nextSelectAll([1, 2, 3], [1, 2, 3]), []);
  });

  test.it("is not 'all selected' when nothing is eligible", () => {
    assert.equal(isAllSelected([], []), false);
  });

  test.it("is not 'all selected' on a partial tick", () => {
    assert.equal(isAllSelected([1, 2], [1]), false);
    assert.equal(isAllSelected([1, 2], [1, 2]), true);
  });
});

test.describe("a selection never outlives its rows", () => {
  test.it("drops ids the refreshed queue no longer offers", () => {
    assert.deepEqual(pruneSelection([1, 2, 3], [1, 3]), [1, 3]);
  });

  test.it("empties when the queue does", () => {
    assert.deepEqual(pruneSelection([1, 2], []), []);
  });

  /*
   * THE RENDER-LOOP REGRESSION, and it is the reason Salary Approval was
   * unusably slow in production.
   *
   * This runs inside a `useState` updater in an effect. React compares the
   * next state with `Object.is`, so a fresh array that happens to hold the
   * same ids is still a state change: it re-renders, the effect runs again,
   * and the screen spins. Returning the identical reference when nothing was
   * dropped is what stops the loop, so identity - not contents - is what
   * these two assert.
   */
  test.it("RETURNS THE SAME ARRAY REFERENCE when nothing is dropped", () => {
    const selected = [1, 2, 3];
    assert.strictEqual(pruneSelection(selected, [1, 2, 3]), selected);
    assert.strictEqual(pruneSelection(selected, [1, 2, 3, 4]), selected);
  });

  test.it("returns a NEW array only when something really was dropped", () => {
    const selected = [1, 2, 3];
    const pruned = pruneSelection(selected, [1, 3]);
    assert.notStrictEqual(pruned, selected);
    assert.deepEqual(pruned, [1, 3]);
  });

  test.it("an empty selection stays the same empty array", () => {
    const empty = [];
    assert.strictEqual(pruneSelection(empty, [1, 2]), empty);
  });
});

test.describe("the hook feeding that effect is reference-stable", () => {
  /*
   * There is no React test runner in this repo, so the hook is checked as
   * source, exactly as `customHooks/useOutlets.test.js` checks its own. What
   * matters is that the object handed to `canApproveProposal` - and therefore
   * to the `useMemo` the effect depends on - is memoised rather than rebuilt
   * on every render.
   */
  const fs = require("fs");
  const path = require("path");
  const hook = fs.readFileSync(
    path.join(__dirname, "..", "customHooks/usePayrollActor.js"),
    "utf8"
  );
  const page = fs.readFileSync(
    path.join(__dirname, "..", "pages/payroll/salary-approval.jsx"),
    "utf8"
  );

  test.it("usePayrollActor memoises its actor on the two facts it reads", () => {
    assert.match(hook, /useMemo\(/);
    assert.match(hook, /\[permissions, userType\]/);
  });

  test.it("the approval screen still derives its eligible ids from that actor", () => {
    assert.match(page, /selectableSalaryIds\(items, actor\)/);
    assert.match(page, /pruneSelection\(prev, eligibleIds\)/);
  });
});

test.describe("what the approver is told", () => {
  test.it("the confirmation names the count and reads singular for one", () => {
    assert.ok(confirmationMessage(3).startsWith("Approve 3 salary revisions?"));
    assert.ok(confirmationMessage(1).startsWith("Approve 1 salary revision?"));
  });

  test.it("the success message is the required sentence", () => {
    assert.equal(successMessage(4), "4 salary revisions approved successfully.");
  });
});
