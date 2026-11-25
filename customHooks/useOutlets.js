import React, { useEffect, useMemo, useState } from "react";
import BranchHelper from "../helper/outlets";
import unwrapList from "../util/apiList";

/**
 * `helper/outlets.js#getOutlet` resolves `res.data` whatever the status, so a
 * B2 permission refusal arrived here as `{ code: 403, msg: … }`, was stored as
 * `outlets`, and the `.filter` below threw during render — taking the whole
 * page to the generic Next.js `/_error`. The refusal is legitimate and the
 * session is intact; only the rendering was broken.
 *
 * `accessDenied` is returned separately so a screen can say "you don't have
 * access to branches" rather than showing an empty dropdown, which would hide
 * an authorisation failure as ordinary missing data.
 */
function useOutlets({ skipIds = [], directory = false } = {}) {
  const [outlets, setOutlets] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  const init = async () => {
    try {
      // `directory: true` asks for the two-column list behind no permission,
      // for callers that only render a dropdown. The default is unchanged, so
      // every existing consumer keeps the full record and the `view_stores`
      // gate that protects it.
      const result = unwrapList(
        directory
          ? await BranchHelper.getOutletDirectory()
          : await BranchHelper.getOutlet()
      );
      setOutlets(result.items);
      setAccessDenied(result.accessDenied);
      setError(result.error);
    } catch (err) {
      // A rejected helper (network failure) is an error, not a denial.
      console.log(err);
      setOutlets([]);
      setAccessDenied(false);
      setError(true);
    }
  };

  useEffect(() => {
    init();
  }, [directory]);

  const filteredOutlets = useMemo(() => {
    // Belt and braces: `outlets` can only be an array by now, but this runs
    // during render, where a throw costs the whole page.
    if (!Array.isArray(outlets)) return [];
    return outlets.filter((outlet) => !skipIds.includes(outlet.outlet_id));
  }, [outlets, skipIds]);

  return { outlets: filteredOutlets, accessDenied, error };
}

export default useOutlets;
