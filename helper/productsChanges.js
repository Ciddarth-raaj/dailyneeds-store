import API from "../util/api";

const productsChanges = {
  list: (params = {}) =>
    new Promise((resolve, reject) => {
      const searchParams = new URLSearchParams();
      if (params.product_id != null) searchParams.set("product_id", params.product_id);
      if (params.is_approved != null) searchParams.set("is_approved", params.is_approved);
      if (params.limit != null) searchParams.set("limit", params.limit);
      if (params.offset != null) searchParams.set("offset", params.offset);
      const query = searchParams.toString();
      const url = query ? `/products-changes?${query}` : "/products-changes";
      API.get(url)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(res?.data?.msg || "Failed to fetch product changes");
          }
        })
        .catch((err) => reject(err));
    }),

  getOne: (productsChangeId) =>
    new Promise((resolve, reject) => {
      API.get(`/products-changes/${productsChangeId}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data);
          } else {
            reject(res?.data?.msg || "Failed to fetch product change");
          }
        })
        .catch((err) => reject(err));
    }),

  approve: (productsChangeId, isApproved) =>
    new Promise((resolve, reject) => {
      API.put(`/products-changes/${productsChangeId}/approve`, {
        is_approved: isApproved,
      })
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data);
          } else {
            reject(res?.data?.msg || "Failed to update approval");
          }
        })
        .catch((err) => reject(err));
    }),
};

export default productsChanges;
