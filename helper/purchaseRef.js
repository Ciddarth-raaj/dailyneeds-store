import API from "../util/api";

/**
 * The Purchase Ref list is served from a short-lived server-side cache, so this
 * normally returns instantly. Pass `{ force: true }` to make the server rebuild
 * it (concurrent rebuilds are collapsed server-side into one).
 */
export const getPurchaseRef = ({ force = false } = {}) => {
  return API.get(`/purchase-ref${force ? "?refresh=1" : ""}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch Purchase Ref");
  });
};
