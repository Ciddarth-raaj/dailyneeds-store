import React, { useMemo, useState, useCallback, isValidElement } from "react";

/**
 * useTableSort
 * - Supports single and multi-column sorting (stable)
 * - Maintains an ordered list of sort descriptors: [{ key, direction }]
 * - Cycles per column: null -> asc -> desc -> null
 * - Multi-sort toggle when modifierKey (metaKey/cmd on mac or shiftKey) is pressed
 */
export default function useTableSort({
  rows = [],
  initialSort = [],
  accessors = {},
  getValue,
} = {}) {
  const [sortState, setSortState] = useState(initialSort);

  const extractText = useCallback((node) => {
    if (node === null || node === undefined) return "";
    if (typeof node === "string" || typeof node === "number")
      return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(" ");
    if (isValidElement(node)) return extractText(node.props?.children);
    if (typeof node === "object" && node && node.props && node.props.children) {
      return extractText(node.props.children);
    }
    return String(node);
  }, []);

  const valueFor = useCallback(
    (row, key) => {
      if (typeof getValue === "function") return getValue(row, key);
      if (accessors && typeof accessors[key] === "function")
        return accessors[key](row);
      return row?.[key];
    },
    [accessors, getValue]
  );

  const toggleSort = useCallback((key, { multi = false } = {}) => {
    setSortState((prev) => {
      const existingIndex = prev.findIndex((s) => s.key === key);
      // Determine next direction for this key
      let nextDirection = "asc";
      if (existingIndex !== -1) {
        const current = prev[existingIndex];
        if (current.direction === "asc") nextDirection = "desc";
        else if (current.direction === "desc") nextDirection = null;
        else nextDirection = "asc";
      }

      // If no multi, reset others
      if (!multi) {
        return nextDirection ? [{ key, direction: nextDirection }] : [];
      }

      // Multi-sort path
      const next = [...prev];
      if (existingIndex === -1) {
        // Add to end with asc
        next.push({ key, direction: nextDirection });
        return next;
      }

      if (nextDirection === null) {
        // Remove key entirely
        next.splice(existingIndex, 1);
        return next;
      }

      // Update direction, keep relative priority order
      next[existingIndex] = { key, direction: nextDirection };
      return next;
    });
  }, []);

  const clearSort = useCallback(() => setSortState([]), []);

  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return rows;
    if (!sortState || sortState.length === 0) return rows;

    // Stable sort: decorate-sort-undecorate
    const decorated = rows.map((item, index) => ({ item, index }));

    const compare = (a, b) => {
      for (let i = 0; i < sortState.length; i += 1) {
        const { key, direction } = sortState[i];
        const dir = direction === "desc" ? -1 : 1; // default asc
        const rawA = valueFor(a.item, key);
        const rawB = valueFor(b.item, key);
        const av = isValidElement(rawA) ? extractText(rawA) : rawA;
        const bv = isValidElement(rawB) ? extractText(rawB) : rawB;

        // Handle undefined/null consistently
        const aUndef = av === undefined || av === null || av === "";
        const bUndef = bv === undefined || bv === null || bv === "";
        if (aUndef && bUndef) continue;
        if (aUndef) return 1; // push undefined to bottom
        if (bUndef) return -1;

        // Numeric vs string compare
        const aNum =
          typeof av === "number" ||
          (typeof av === "string" && av !== "" && !isNaN(av));
        const bNum =
          typeof bv === "number" ||
          (typeof bv === "string" && bv !== "" && !isNaN(bv));

        if (aNum && bNum) {
          const diff = Number(av) - Number(bv);
          if (diff !== 0) return diff * dir;
          continue;
        }

        // Date detection (ISO-like or Date instances)
        const aDate =
          av instanceof Date ||
          (typeof av === "string" && !isNaN(Date.parse(av)));
        const bDate =
          bv instanceof Date ||
          (typeof bv === "string" && !isNaN(Date.parse(bv)));
        if (aDate && bDate) {
          const diff = new Date(av).getTime() - new Date(bv).getTime();
          if (diff !== 0) return diff * dir;
          continue;
        }

        // Fallback to string compare (case-insensitive)
        const aStr = String(av).toLowerCase();
        const bStr = String(bv).toLowerCase();
        if (aStr < bStr) return -1 * dir;
        if (aStr > bStr) return 1 * dir;
        // else equal, continue to next key
      }
      // Keep original order if all keys equal
      return a.index - b.index;
    };

    decorated.sort(compare);
    return decorated.map((d) => d.item);
  }, [rows, sortState, extractText, valueFor]);

  return {
    sortState,
    setSortState,
    toggleSort,
    clearSort,
    sortedRows,
  };
}
