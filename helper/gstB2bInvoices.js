import API from "../util/api";

/**
 * Stored GSTR-2A B2B invoices for a return period (MySQL; no Sandbox).
 * GET /gst/b2b/invoices/:year/:month
 * @see dailyneeds-store-backend/docs/gst-b2b-stored-invoices-api.md
 */
export function getGstB2bInvoices(year, month) {
  const y = String(year).trim();
  const mo = parseInt(String(month).trim(), 10);
  const m =
    Number.isFinite(mo) && mo >= 1 && mo <= 12 ? String(mo) : String(month).trim();
  return API.get(`/gst/b2b/invoices/${encodeURIComponent(y)}/${encodeURIComponent(m)}`).then(
    (res) => {
      const body = res?.data ?? res;
      if (body?.code === 200) {
        return {
          data: Array.isArray(body.data) ? body.data : [],
          meta: body.meta ?? null,
        };
      }
      throw new Error(body?.msg || "Failed to load GSTR-2A B2B invoices");
    }
  );
}
