import API from "../util/api";

const unwrap = (fallback) => (res) => {
  const body = res?.data ?? {};
  if (body.code === 200) return body;
  throw new Error(body.msg || fallback);
};
const fail = (fallback) => (err) => {
  throw new Error(err?.response?.data?.msg || err?.message || fallback);
};

/** Out-of-stock follow-up (backend routes/oos_followup.js). */
const OosFollowupHelper = {
  /** Chaser: { buyer_id?: number | "none", hidden?: 1 }; buyer: own lines. */
  view: (params = {}) =>
    API.get("/oos-followup", { params }).then(unwrap("Failed to load the out-of-stock list")).catch(fail("Failed to load the out-of-stock list")),
  upload: (body) =>
    API.post("/oos-followup/upload", body).then(unwrap("Upload failed")).catch(fail("Upload failed")),
  answer: (id, body) =>
    API.post(`/oos-followup/cases/${id}/answer`, body).then(unwrap("Could not save")).catch(fail("Could not save")),
  /** One answer for several lines (an item's stores). */
  answerMany: (ids, body) =>
    API.post("/oos-followup/answer", { ids, ...body }).then(unwrap("Could not save")).catch(fail("Could not save")),
  events: (id) =>
    API.get(`/oos-followup/cases/${id}/events`).then(unwrap("Could not load the history")).catch(fail("Could not load the history")),
};

export default OosFollowupHelper;
