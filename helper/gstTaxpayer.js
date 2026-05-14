import API from "../util/api";

/**
 * GST taxpayer Sandbox session / OTP.
 * @see dailyneeds-store-backend/docs/gst-taxpayer-session-fe.md
 */

const wideValidate = { validateStatus: () => true };

export function getTaxpayerSession() {
  return API.get("/gst/taxpayer/session").then((res) => {
    const body = res?.data ?? res;
    if (body?.code === 200) return body;
    throw new Error(body?.msg || "Failed to load GST taxpayer session");
  });
}

/**
 * @returns {{ httpStatus: number, data: object }}
 */
export function getTaxpayerSessionCheck() {
  return API.get("/gst/taxpayer/session/check", wideValidate).then((res) => ({
    httpStatus: res.status,
    data: res.data ?? {},
  }));
}

export function postTaxpayerOtpRequest() {
  return API.post("/gst/taxpayer/otp/request", {}, wideValidate).then(
    (res) => ({
      httpStatus: res.status,
      data: res.data ?? {},
    })
  );
}

export function postTaxpayerOtpVerify(otp) {
  return API.post("/gst/taxpayer/otp/verify", { otp }, wideValidate).then(
    (res) => ({
      httpStatus: res.status,
      data: res.data ?? {},
    })
  );
}

export function postTaxpayerRevalidate(otp) {
  return API.post("/gst/taxpayer/revalidate", { otp }, wideValidate).then(
    (res) => ({
      httpStatus: res.status,
      data: res.data ?? {},
    })
  );
}
