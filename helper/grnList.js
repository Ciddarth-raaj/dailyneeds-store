import API from "../util/api";

export const getGrnList = ({ from_date, to_date } = {}) => {
  const params = {};
  if (from_date) params.from_date = from_date;
  if (to_date) params.to_date = to_date;

  return API.get("/grn/list", { params }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch GRN list");
  });
};

/**
 * GRN No search across every date. The server matches and ranks (exact GRN
 * first, then numbers starting with `q`) and applies the user's GRN
 * permission; nothing is filtered here.
 */
export const searchGrn = (q) => {
  return API.get("/grn/search", { params: { q } }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to search GRNs");
  });
};

export const getGrnIssues = ({ from_date, to_date } = {}) => {
  const params = {};
  if (from_date) params.from_date = from_date;
  if (to_date) params.to_date = to_date;

  return API.get("/grn/issues", { params }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch GRN issues");
  });
};

export const ignoreGrnIssues = (items) => {
  return API.post("/grn/issues/ignore", { items }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to ignore GRN issue(s)");
  });
};

export const unignoreGrnIssues = (items) => {
  return API.post("/grn/issues/unignore", { items }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to un-ignore GRN issue(s)");
  });
};

export const getGrnDetail = (refno) => {
  return API.get("/grn/detail", {
    params: { refno },
  }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    if (data?.code === 404) {
      throw new Error(data?.msg || "GRN not found");
    }
    throw new Error(data?.msg || "Failed to fetch GRN detail");
  });
};

/**
 * Signs a GRN off as checked and verified.
 *
 * The approver and the timestamp are NOT sent: the backend takes the verifier
 * from the authenticated session and the time from its own clock. Sending
 * them from here would be an audit record the browser dictated.
 */
export const verifyGrn = (refno) => {
  return API.post(`/grn/${encodeURIComponent(String(refno))}/verify`).then(
    (res) => {
      const data = res?.data ?? res;
      if (data?.code === 200) return data;
      throw new Error(data?.msg || "Failed to verify GRN");
    }
  );
};
