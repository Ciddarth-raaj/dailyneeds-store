import { useEffect, useMemo, useState } from "react";
import ReportHelper from "../helper/report";
import useOutlets from "./useOutlets";
import useDepartments from "./useDepartments";
import useDesignations from "./useDesignations";

/**
 * Reports — the field catalogue, and the masters its filters draw on.
 *
 * The catalogue is the SERVER'S description of what this caller may report on:
 * which fields exist for them, how those fields group, and - since the filter
 * work - what control each one is filtered with. It is fetched, never
 * declared. There is deliberately no list of Employee Master fields anywhere
 * in the frontend, because a second list is a second answer, and the one that
 * would drift is the one not attached to the SQL.
 *
 * The three masters are loaded here too, so both report screens resolve an
 * outlet id to an outlet name the same way. `directory: true` is the
 * permission-free two-column list: choosing an outlet to filter by needs a
 * name and an id, not the right to administer branches.
 */
export default function useReportCatalogue() {
  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();
  const { designations } = useDesignations();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const body = await ReportHelper.getFields();
        if (!live) return;
        if (body && body.code >= 400) {
          setError(body.msg || "The report fields could not be loaded.");
          return;
        }
        setCatalogue(body);
      } catch (err) {
        if (live) setError("The report fields could not be loaded.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  /**
   * Options for the master-linked filters, keyed by the `master` name the
   * catalogue itself uses - so adding a master-linked field on the server
   * needs no matching change here beyond a list to draw from.
   */
  const masters = useMemo(
    () => ({
      outlets: (Array.isArray(outlets) ? outlets : []).map((o) => ({
        value: o.outlet_id ?? o.id,
        label: o.outlet_name ?? o.name,
      })),
      departments: (Array.isArray(departments) ? departments : []).map((d) => ({
        value: d.department_id,
        label: d.department_name,
      })),
      designations: (Array.isArray(designations) ? designations : []).map((d) => ({
        value: d.designation_id,
        label: d.designation_name,
      })),
    }),
    [outlets, departments, designations]
  );

  return { catalogue, masters, error, loading };
}
