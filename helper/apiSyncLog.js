import API from "../util/api";

const apiSyncLog = {
  getLogs: (params = {}) =>
    new Promise((resolve, reject) => {
      API.get("/api-sync-log", { params })
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data.data ?? []);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch API logs"));
        })
        .catch(reject);
    }),

  getTimeline: (params = {}) =>
    new Promise((resolve, reject) => {
      API.get("/api-sync-log/timeline", { params })
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data.data ?? []);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch timeline"));
        })
        .catch(reject);
    }),

  getCronConfigs: () =>
    new Promise((resolve, reject) => {
      API.get("/api-sync-log/cron-config")
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data.data ?? []);
          else reject(new Error(res?.data?.msg ?? "Failed to fetch cron config"));
        })
        .catch(reject);
    }),

  updateCronConfig: (payload) =>
    new Promise((resolve, reject) => {
      API.put("/api-sync-log/cron-config", payload)
        .then((res) => {
          if (res?.data?.code === 200) resolve(res.data);
          else reject(new Error(res?.data?.msg ?? "Failed to update cron config"));
        })
        .catch(reject);
    }),
};

export default apiSyncLog;
