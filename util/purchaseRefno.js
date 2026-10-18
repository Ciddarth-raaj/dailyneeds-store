/**
 * Sort order for MRC Ref No on the Purchase screen. The column is text in
 * the database (purchase.mmh_mrc_refno), so the grid would sort it as text:
 * "999" after "6385", "10" before "9". Numbers sort as numbers here; a ref
 * no that is not a plain number sorts after them, as text; blanks go last.
 *
 * Plain CommonJS with no dependencies, so `node --test` loads it as is.
 */

const isNumber = (v) => /^\d+$/.test(v);

function compareRefno(a, b) {
  const x = a == null ? "" : String(a).trim();
  const y = b == null ? "" : String(b).trim();
  if (x === y) return 0;
  if (x === "") return 1;
  if (y === "") return -1;
  const nx = isNumber(x);
  const ny = isNumber(y);
  if (nx && ny) return Number(x) - Number(y) || x.localeCompare(y);
  if (nx) return -1;
  if (ny) return 1;
  return x.localeCompare(y, undefined, { numeric: true });
}

module.exports = { compareRefno };
