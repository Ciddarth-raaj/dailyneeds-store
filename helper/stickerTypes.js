import API from "../util/api";

/**
 * Sticker Types API - see backend docs/sticker-types-api.md
 */

export const getStickerTypes = (params = {}) => {
  const search = new URLSearchParams();
  if (params.label != null) search.set("label", params.label);
  if (params.limit != null) search.set("limit", params.limit);
  if (params.offset != null) search.set("offset", params.offset);
  const qs = search.toString();
  return API.get(`/sticker-types${qs ? `?${qs}` : ""}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch sticker types");
  });
};

export const getStickerTypeById = (id) => {
  return API.get(`/sticker-types/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch sticker type");
  });
};

export const createStickerType = (body) => {
  return API.post("/sticker-types", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create sticker type");
  });
};

export const updateStickerType = (id, body) => {
  return API.put(`/sticker-types/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update sticker type");
  });
};

export const deleteStickerType = (id) => {
  return API.delete(`/sticker-types/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete sticker type");
  });
};
