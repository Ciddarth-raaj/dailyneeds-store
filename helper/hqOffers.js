import API from "../util/api";

const hqOffers = {
  listHdr: (params = {}) => {
    const { filter, ...rest } = params;
    const query = { ...rest };
    if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
      query.filter = JSON.stringify(filter);
    }
    return new Promise((resolve, reject) => {
      API.get("/hq-offers/hdr", { params: query })
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch offers"));
        })
        .catch(reject);
    });
  },

  listHdrAll: (params = {}) => {
    const { filter, ...rest } = params;
    const query = { ...rest, limit: "all" };
    if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
      query.filter = JSON.stringify(filter);
    }
    return new Promise((resolve, reject) => {
      API.get("/hq-offers/hdr", { params: query })
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch offers"));
        })
        .catch(reject);
    });
  },

  getByKey: (mohOfferId, retailOutletId) =>
    new Promise((resolve, reject) => {
      if (
        mohOfferId == null ||
        mohOfferId === "" ||
        retailOutletId == null ||
        retailOutletId === ""
      ) {
        reject(new Error("moh_offer_id and retail_outlet_id are required"));
        return;
      }
      API.get(
        `/hq-offers/hdr/${encodeURIComponent(mohOfferId)}/${encodeURIComponent(retailOutletId)}`
      )
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data.data);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch offer"));
        })
        .catch((err) => {
          const msg =
            err?.response?.data?.msg ??
            err?.data?.msg ??
            err?.message ??
            "Failed to fetch offer";
          reject(new Error(msg));
        });
    }),
};

export default hqOffers;
