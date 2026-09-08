import { useEffect, useState } from "react";
import ShiftHelper from "../helper/shift";

/**
 * `/shift` is B2-gated on `view_shift`, which HR does not necessarily hold.
 *
 * A refusal is reported as `accessDenied` rather than as an empty list, so the
 * profile can leave the shift dropdown out instead of offering an empty one
 * that looks like "this company has no shifts".
 *
 * The helper returns `{ id, value }`; this normalises to the `{ shift_id,
 * shift_name }` shape every other master uses, so the section that renders it
 * does not need to know which helper it came from.
 */
function useShifts() {
  const [shifts, setShifts] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ShiftHelper.getShift();
        if (cancelled) return;
        if (!Array.isArray(rows)) {
          // A B2 refusal arrives as `{ code: 403, msg }`, not a list.
          setShifts([]);
          setAccessDenied(Boolean(rows && rows.code === 403));
          setError(!rows || rows.code !== 403);
          return;
        }
        setShifts(
          rows
            .filter((r) => r && r.id !== undefined && r.id !== null)
            .map((r) => ({ shift_id: r.id, shift_name: r.value }))
        );
        setAccessDenied(false);
        setError(false);
      } catch (err) {
        if (cancelled) return;
        setShifts([]);
        setAccessDenied(false);
        setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { shifts, accessDenied, error };
}

export default useShifts;
