import API from "../util/api";

/**
 * Article Store Master report (backend routes/article_store_master.js): the
 * file DNDS builds from RetailPilot every morning at 5:45 AM.
 */

export const getArticleStoreMasterStatus = async () => {
  const res = await API.get("/article-store-master/status");
  return res.data;
};

export const refreshArticleStoreMaster = async () => {
  const res = await API.post("/article-store-master/refresh");
  return res.data;
};

/**
 * Download the newest file. `responseType: "blob"` with `transformResponse`
 * disabled, because the shared axios instance parses every response as JSON
 * and would destroy a binary body; a refusal still arrives as JSON and is
 * read back out of the blob instead of being saved as a broken spreadsheet.
 */
export const downloadArticleStoreMaster = async (fallbackName) => {
  const res = await API.request({
    method: "GET",
    url: "/article-store-master/download",
    responseType: "blob",
    transformResponse: [(data) => data],
  });
  const blob = res.data;
  if (blob && blob.type && String(blob.type).includes("json")) {
    let msg = "The report could not be downloaded";
    try {
      msg = JSON.parse(await blob.text()).msg || msg;
    } catch (e) {
      /* keep the generic message */
    }
    throw new Error(msg);
  }
  const disposition = res.headers?.["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match ? match[1] : fallbackName || "article-store-master.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
