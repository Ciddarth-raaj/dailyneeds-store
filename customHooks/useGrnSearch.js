import { useEffect, useState } from "react";
import { searchGrn } from "../helper/grnList";

/**
 * Server-side GRN No search. An empty term is idle: no request, no results.
 *
 * Only the answer for the CURRENT term is kept - a slow reply for "59"
 * arriving after the one for "5972" must not overwrite it.
 */
export function useGrnSearch(term) {
  const [state, setState] = useState({
    results: [],
    truncated: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!term) {
      setState({ results: [], truncated: false, loading: false, error: null });
      return undefined;
    }

    let current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    searchGrn(term)
      .then((res) => {
        if (!current) return;
        setState({
          results: Array.isArray(res?.data) ? res.data : [],
          truncated: Boolean(res?.meta?.truncated),
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!current) return;
        setState({ results: [], truncated: false, loading: false, error: err });
      });

    return () => {
      current = false;
    };
  }, [term]);

  return state;
}
