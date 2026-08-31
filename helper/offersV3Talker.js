import API from "../util/api";

function unwrap(promise, fallbackMsg) {
  return promise.then((res) => {
    if (res?.data?.code === 200) return res.data;
    const err = new Error(res?.data?.msg ?? fallbackMsg);
    err.response = res;
    throw err;
  });
}

/**
 * Offer Talker Verification API.
 *
 * A talker group is one physical shelf sign covering many article codes; it has
 * locations per outlet (a brand's stock can sit in more than one place), and a
 * proof is one photo round for one location.
 */
const offersV3Talker = {
  groups: {
    list: (params = {}) =>
      unwrap(
        API.get("/offers-v3-talker/groups", { params }),
        "Failed to fetch talker groups"
      ).then((d) => d.data ?? []),

    getById: (id) =>
      unwrap(
        API.get(`/offers-v3-talker/groups/${id}`),
        "Failed to fetch talker group"
      ).then((d) => d.data),

    ungrouped: () =>
      unwrap(
        API.get("/offers-v3-talker/groups/ungrouped"),
        "Failed to fetch ungrouped articles"
      ).then((d) => ({ data: d.data ?? [], count: d.meta?.count ?? 0 })),

    /** Articles currently on offer - the only valid pool for group membership. */
    offerArticles: () =>
      unwrap(
        API.get("/offers-v3-talker/offer-articles"),
        "Failed to fetch offer articles"
      ).then((d) => d.data ?? []),

    create: (data) =>
      unwrap(
        API.post("/offers-v3-talker/groups", data),
        "Failed to create talker group"
      ),

    update: (id, data) =>
      unwrap(
        API.put(`/offers-v3-talker/groups/${id}`, data),
        "Failed to update talker group"
      ),

    setItems: (id, { add = [], remove = [] }) =>
      unwrap(
        API.put(`/offers-v3-talker/groups/${id}/items`, { add, remove }),
        "Failed to update group articles"
      ),

    publish: (id) =>
      unwrap(
        API.post(`/offers-v3-talker/groups/${id}/publish`, {}),
        "Failed to publish group"
      ),

    end: (id) =>
      unwrap(
        API.post(`/offers-v3-talker/groups/${id}/end`, {}),
        "Failed to end group"
      ),

    remove: (id) =>
      unwrap(
        API.delete(`/offers-v3-talker/groups/${id}`),
        "Failed to delete group"
      ),

    merge: (from_group_id, to_group_id) =>
      unwrap(
        API.post("/offers-v3-talker/groups/merge", {
          from_group_id,
          to_group_id,
        }),
        "Failed to merge groups"
      ),

    split: (id, { item_codes, label }) =>
      unwrap(
        API.post(`/offers-v3-talker/groups/${id}/split`, { item_codes, label }),
        "Failed to split group"
      ),

    autoDerive: () =>
      unwrap(
        API.post("/offers-v3-talker/groups/auto-derive", {}),
        "Failed to auto-derive groups"
      ),
  },

  print: {
    /** One card per physical sign to print, derived from each group's offer. */
    cards: (params = {}) =>
      unwrap(
        API.get("/offers-v3-talker/print-cards", { params }),
        "Failed to fetch talkers to print"
      ).then((d) => d.cards ?? []),

    /** Store what the printed sign says, so the photo check compares to it. */
    syncText: (group_ids) =>
      unwrap(
        API.post("/offers-v3-talker/print-cards/sync-text", { group_ids }),
        "Failed to save expected sign text"
      ),
  },

  suggested: {
    resolve: (id, accept) =>
      unwrap(
        API.post(`/offers-v3-talker/suggested/${id}/resolve`, { accept }),
        "Failed to resolve suggestion"
      ),
  },

  queue: {
    forOutlet: (outlet_id, round_date) =>
      unwrap(
        API.get("/offers-v3-talker/queue", {
          params: { outlet_id, ...(round_date ? { round_date } : {}) },
        }),
        "Failed to fetch talker queue"
      ),
  },

  locations: {
    create: (data) =>
      unwrap(
        API.post("/offers-v3-talker/locations", data),
        "Failed to add location"
      ),

    markGone: (id) =>
      unwrap(
        API.post(`/offers-v3-talker/locations/${id}/gone`, {}),
        "Failed to mark location gone"
      ),
  },

  proofs: {
    submit: (data) =>
      unwrap(API.post("/offers-v3-talker/proofs", data), "Failed to submit photo"),

    submitDiscovery: (data) =>
      unwrap(
        API.post("/offers-v3-talker/proofs/discovery", data),
        "Failed to submit photo"
      ),

    list: (params = {}) =>
      unwrap(
        API.get("/offers-v3-talker/proofs", { params }),
        "Failed to fetch proofs"
      ).then((d) => d.data ?? []),

    override: (id, review_note) =>
      unwrap(
        API.post(`/offers-v3-talker/proofs/${id}/override`, { review_note }),
        "Failed to override"
      ),

    confirmReject: (id, review_note) =>
      unwrap(
        API.post(`/offers-v3-talker/proofs/${id}/confirm-reject`, {
          review_note,
        }),
        "Failed to confirm reject"
      ),
  },

  board: {
    get: (round_date) =>
      unwrap(
        API.get("/offers-v3-talker/board", {
          params: round_date ? { round_date } : {},
        }),
        "Failed to fetch board"
      ),
  },

  pushToQueue: (group_id, outlet_id) =>
    unwrap(
      API.post("/offers-v3-talker/push-to-queue", { group_id, outlet_id }),
      "Failed to push to queue"
    ),
};

export default offersV3Talker;
