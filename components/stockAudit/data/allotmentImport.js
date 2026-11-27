/**
 * Article allotment IMPORT (RetailPilot export -> DNDS). Pure functions.
 *
 * Allotment is done in RetailPilot. This only READS RetailPilot's exported
 * file: it never creates or edits an allotment. The column format is NOT
 * final - it waits for the real RetailPilot export - so columns are mapped by
 * the user, with guesses from common header names.
 *
 * FIRST REAL EXPORT SEEN (27 Nov 2026, "assortment-effective-<auditor>.csv"):
 * one file per AUDITOR, allotted by category node, columns Store (RetailPilot
 * store ID), Store name, Auditor (Keypoint user ID - the same ID RetailPilot
 * audit sessions carry), Auditor name, Node, Level, Article ID, Article,
 * Owned, Positive/Negative/Net stock, Sellable, Buyable, Effective, Reason.
 * Rows with Effective = N are NOT AUDITABLE (confirmed 27 Nov 2026): they are
 * never allotted and an audit of one earns no article incentive. Stock
 * columns are book stock: never imported, never used for accuracy.
 *
 * A revised upload is compared with the latest accepted revision of the same
 * cycle and branch (or, for a per-auditor file, that auditor only). Rows missing from a corrections-only file are NOT treated
 * as removed; only a file confirmed as a COMPLETE REPLACEMENT can remove.
 */

import * as XLSX from "xlsx";

export const FIELDS = [
  { key: "branch", label: "Branch ID or name", required: true, guesses: ["store", "branch", "outlet", "store id", "branch id", "branch name", "store name"] },
  { key: "employee", label: "Employee ID or RetailPilot user ID", required: true, guesses: ["auditor", "auditor id", "employee id", "employee code", "user id", "rp user", "retailpilot user", "assigned to id", "user"] },
  { key: "employee_name", label: "Employee name", required: false, guesses: ["auditor name", "employee name", "assigned to", "user name", "name"] },
  { key: "article", label: "Article ID or code", required: true, guesses: ["article id", "article code", "item code", "sku", "article", "item id", "product id"] },
  { key: "article_name", label: "Article name", required: false, guesses: ["article name", "article", "item name", "product name", "description"] },
  { key: "node", label: "Category / allotted node", required: false, guesses: ["node", "category", "hierarchy"] },
  { key: "effective", label: "Effective (Y/N)", required: false, guesses: ["effective"] },
  { key: "reason", label: "Effective reason", required: false, guesses: ["reason"] },
  { key: "barcode", label: "Barcode", required: false, guesses: ["barcode", "ean", "ean code"] },
  { key: "allotment_date", label: "Allotment date", required: false, guesses: ["allotment date", "assigned date", "date"] },
  { key: "deadline", label: "Audit deadline", required: false, guesses: ["deadline", "due date", "audit deadline"] },
];

const norm = (v) => String(v == null ? "" : v).trim().toLowerCase().replace(/[_\s]+/g, " ");

/** Read the first sheet: { headers, rows: [object] } with the first non-empty row as headers. */
export async function readWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  const headerAt = grid.findIndex((r) => r.filter((c) => String(c).trim() !== "").length >= 2);
  if (headerAt < 0) return { headers: [], rows: [] };
  const headers = grid[headerAt].map((h) => String(h).trim());
  const rows = grid.slice(headerAt + 1).filter((r) => r.some((c) => String(c).trim() !== "")).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  return { headers, rows, sheet: wb.SheetNames[0] };
}

/** Guess a mapping { fieldKey: header } from header names. */
export function guessMapping(headers) {
  const used = new Set();
  const out = {};
  for (const f of FIELDS) {
    let hit = null;
    for (const g of f.guesses) { hit = headers.find((h) => !used.has(h) && norm(h) === g); if (hit) break; }
    if (!hit) hit = headers.find((h) => !used.has(h) && f.guesses.some((g) => g.length > 3 && norm(h).includes(g)));
    if (hit) { out[f.key] = hit; used.add(hit); }
  }
  return out;
}

export function missingRequired(mapping) {
  return FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);
}

/**
 * Validate mapped rows for ONE branch.
 * @param masters.branch   { outlet_id, name, rp_id }
 * @param masters.employeeOf (value) => employee | null    (DNDS code or RetailPilot user id)
 * @param masters.articleOf  (value) => article | null
 * @returns { rows: [{ line, ...values, errors, warnings }], summary }
 */
export function validateRows(rawRows, mapping, masters) {
  const pick = (r, k) => (mapping[k] ? String(r[mapping[k]] == null ? "" : r[mapping[k]]).trim() : "");
  const seen = new Map(); // article -> first line + employee
  const out = rawRows.map((r, i) => {
    const v = Object.fromEntries(FIELDS.map((f) => [f.key, pick(r, f.key)]));
    const errors = [];
    const warnings = [];
    const b = masters.branch;
    if (!v.branch) errors.push("Branch missing");
    else if (![String(b.outlet_id), norm(b.name), norm(b.rp_id)].includes(norm(v.branch))) errors.push(`Branch "${v.branch}" is not ${b.name}`);
    const emp = v.employee ? masters.employeeOf(v.employee) : null;
    if (!v.employee) errors.push("Employee missing");
    else if (!emp) errors.push(`Employee "${v.employee}" not mapped`);
    const art = v.article ? masters.articleOf(v.article) : null;
    if (!v.article) errors.push("Article missing");
    else if (!art) errors.push(`Article "${v.article}" not found`);
    if (emp && v.employee_name && emp.name && norm(emp.name) !== norm(v.employee_name)) warnings.push(`Name in file "${v.employee_name}" differs from ${emp.name}`);
    // Effective = N: not auditable (confirmed) - never allotted.
    const notEffective = mapping.effective ? norm(v.effective) === "n" : false;
    return { line: i + 2, ...v, employee_id: emp ? emp.employee_id : null, rp_user_id: emp ? emp.rp_user_id : null, effective: !notEffective, errors, warnings };
  });
  for (const row of out) {
    if (!row.article || !row.effective) continue;
    const prev = seen.get(row.article);
    if (!prev) { seen.set(row.article, row); continue; }
    if (prev.employee === row.employee) row.errors.push(`Duplicate of line ${prev.line}`);
    else {
      row.errors.push(`Also allotted to ${prev.employee} (line ${prev.line})`);
      if (!prev.errors.some((e) => e.startsWith("Allotted to more than one"))) prev.errors.push("Allotted to more than one employee");
    }
  }
  const invalid = out.filter((r) => r.errors.length);
  const count = (re) => out.filter((r) => r.errors.some((e) => re.test(e))).length;
  return {
    rows: out,
    summary: {
      total: out.length,
      valid: out.length - invalid.length,
      invalid: invalid.length,
      warnings: out.filter((r) => r.warnings.length).length,
      effective: out.filter((r) => r.effective).length,
      not_effective: out.filter((r) => !r.effective).length,
      allotted_valid: out.filter((r) => r.effective && !r.errors.length).length,
      auditors: [...new Set(out.map((r) => r.employee).filter(Boolean))],
      unmapped_employees: new Set(out.filter((r) => r.errors.some((e) => /not mapped/.test(e))).map((r) => r.employee)).size,
      unmapped_articles: count(/not found/),
      duplicates: count(/Duplicate of line/),
      conflicts: count(/Also allotted to|more than one/),
      branch_errors: count(/Branch/),
    },
  };
}

/**
 * Compare a new upload with the latest accepted allotment (article -> employee).
 * @param completeReplacement only then can an article missing from the file be "removed"
 */
export function diffRevision(previous, nextRows, { completeReplacement, scope = "branch" }) {
  const next = new Map(nextRows.filter((r) => !r.errors.length && r.effective !== false).map((r) => [String(r.article), String(r.employee)]));
  // A per-auditor file can only replace THAT auditor's allotment.
  const auditors = new Set(nextRows.map((r) => String(r.employee)));
  const inScope = (p) => scope !== "auditor" || auditors.has(String(p.employee)) || next.has(String(p.article));
  const prev = new Map(previous.filter(inScope).map((p) => [String(p.article), String(p.employee)]));
  const added = [];
  const reassigned = [];
  const unchanged = [];
  for (const [a, e] of next) {
    if (!prev.has(a)) added.push({ article: a, to: e });
    else if (prev.get(a) !== e) reassigned.push({ article: a, from: prev.get(a), to: e });
    else unchanged.push({ article: a, employee: e });
  }
  const missing = [...prev.keys()].filter((a) => !next.has(a)).map((a) => ({ article: a, from: prev.get(a) }));
  return {
    added,
    reassigned,
    unchanged,
    removed: completeReplacement ? missing : [],
    not_in_file: completeReplacement ? [] : missing,
  };
}

/**
 * A SAMPLE file in the real RetailPilot export layout (one auditor, category
 * nodes, Effective flag), with a few deliberate problems for the preview.
 */
export function sampleWorkbook(store, employees, { revision = 1 } = {}) {
  const head = ["Store", "Store name", "Auditor", "Auditor name", "Node", "Level", "Article ID", "Article", "Owned", "Positive stock", "Negative stock", "Net stock", "Sellable", "Buyable", "Effective", "Reason"];
  const emps = employees.filter((e) => e.outlet_id === store.outlet_id);
  const me = emps[revision === 2 ? 1 : 0];
  const nodes = ["Tea", "Coffee", "Jams, Honey & Spreads", "Rusk, Toast & Khari"];
  const rows = [head];
  let article = 100100;
  nodes.forEach((node, ni) => {
    for (let k = 0; k < 12; k++) {
      article += 1;
      const eff = k % 5 !== 4;
      const zero = k % 7 === 3;
      rows.push([store.rp_id, store.name.toLowerCase(), me.rp_user_id, (me.name || me.rp_name).toLowerCase(), node, "category", article, `sample ${node.toLowerCase()} article ${article}`, "Y",
        eff && !zero ? "12.000" : "", eff ? "0" : "", eff && !zero ? "12.000" : zero ? "0.000" : "", eff ? "Y" : "N", eff ? "Y" : "N", eff ? "Y" : "N",
        eff ? (zero ? "zero stock, sellable and buyable" : "has stock") : "no stock record at store"]);
    }
  });
  // deliberate problems
  rows.push([store.rp_id, store.name.toLowerCase(), "UNKNOWNUSER1", "unknown person", "Tea", "category", 100190, "sample tea article 100190", "Y", "3.000", "0", "3.000", "Y", "Y", "Y", "has stock"]);
  rows.push([store.rp_id, store.name.toLowerCase(), me.rp_user_id, (me.name || me.rp_name).toLowerCase(), "Tea", "category", 100101, "sample tea article 100101 (duplicate)", "Y", "1.000", "0", "1.000", "Y", "Y", "Y", "has stock"]);
  rows.push([store.rp_id, store.name.toLowerCase(), emps[2].rp_user_id, (emps[2].name || emps[2].rp_name).toLowerCase(), "Coffee", "category", 100114, "sample coffee article 100114 (second auditor)", "Y", "2.000", "0", "2.000", "Y", "Y", "Y", "has stock"]);
  rows.push(["9rJMC", "warehouse", me.rp_user_id, (me.name || me.rp_name).toLowerCase(), "Tea", "category", 100191, "sample tea article 100191 (wrong branch)", "Y", "4.000", "0", "4.000", "Y", "Y", "Y", "has stock"]);
  rows.push([store.rp_id, store.name.toLowerCase(), me.rp_user_id, (me.name || me.rp_name).toLowerCase(), "Tea", "category", "ABC-1", "unknown article", "Y", "", "", "", "Y", "Y", "Y", "has stock"]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "assortment-effective");
  return wb;
}

export function workbookToFile(wb, name) {
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([out], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
