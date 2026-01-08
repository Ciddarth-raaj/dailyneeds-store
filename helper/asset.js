import API from "../util/api";

const asset = {
  upload: (file, name, folder, type, actualName) =>
    new Promise(function (resolve, reject) {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("name", name);
      formData.append("folder", folder);
      formData.append("actualName", actualName);
      formData.append("type", type == undefined ? "open" : type);
      API.post("/asset", formData)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    }),
};

export default asset;
