import React from "react";
import { Badge, Text } from "@chakra-ui/react";
import { formatINR } from "../../util/payrollDashboard";
import { shortDay } from "../../util/businessDashboard";
import { Heading, ItemList, SideDrawer, SimpleTable, periodText, valueCount } from "./DrawerParts";

const pctText = (v) => (v === null || v === undefined ? "—" : `${v}%`);
const money = (v) => formatINR(v);

const storeCol = {
  label: "Store",
  get: (r) => (
    <>
      {r.name}{" "}
      {r.mapped === false ? (
        <Badge colorScheme="orange" fontSize="9px">
          not in Branch Master
        </Badge>
      ) : null}
    </>
  ),
};
const dayCol = { label: "Day", get: (r) => shortDay(r.day) };

/**
 * What each top tile opens: the same figure per store and, for a period
 * longer than a day, per day - for the dashboard's period and store.
 */
function sections({ totals, byStore, pr }) {
  const sorted = (key) => [...byStore].sort((a, b) => (b[key] || 0) - (a[key] || 0) || a.name.localeCompare(b.name));
  return {
    sales: {
      title: "Sales",
      sub: `${money(totals.sales)} · ${totals.bills} bills · avg ${money(totals.avg_bill)} · net of returns ${money(totals.net_sales)}`,
      store: {
        rows: sorted("sales"),
        columns: [
          storeCol,
          { label: "Sales", get: (r) => money(r.sales), numeric: true, bold: true, total: money(totals.sales) },
          { label: "Bills", get: (r) => r.bills, numeric: true, total: totals.bills },
          { label: "Avg bill", get: (r) => money(r.avg_bill), numeric: true, total: money(totals.avg_bill) },
          { label: "Net sales", get: (r) => money(r.net_sales), numeric: true, total: money(totals.net_sales) },
        ],
      },
      day: [
        dayCol,
        { label: "Sales", get: (r) => money(r.sales), numeric: true },
        { label: "Net sales", get: (r) => money(r.sales - r.returns), numeric: true },
      ],
    },
    returns: {
      title: "Sales Return (SR)",
      sub: `${money(totals.returns)} · ${totals.return_bills} returns · ${pctText(totals.return_pct)} of sales`,
      store: {
        rows: sorted("returns"),
        columns: [
          storeCol,
          { label: "SR", get: (r) => money(r.returns), numeric: true, bold: true, total: money(totals.returns) },
          { label: "Returns", get: (r) => r.return_bills, numeric: true, total: totals.return_bills },
          { label: "SR %", get: (r) => pctText(r.return_pct), numeric: true, total: pctText(totals.return_pct) },
        ],
      },
      day: [dayCol, { label: "SR", get: (r) => money(r.returns), numeric: true }],
    },
    purchase: {
      title: "Purchase",
      sub: `${money(totals.purchase)} · ${totals.purchase_invoices} invoices entered in the period`,
      store: {
        rows: sorted("purchase"),
        columns: [
          storeCol,
          { label: "Purchase", get: (r) => money(r.purchase), numeric: true, bold: true, total: money(totals.purchase) },
          { label: "Invoices", get: (r) => r.purchase_invoices, numeric: true, total: totals.purchase_invoices },
        ],
      },
      day: [dayCol, { label: "Purchase", get: (r) => money(r.purchase), numeric: true }],
    },
    purchase_return: {
      title: "Purchase Return (PR)",
      sub: `${money(totals.purchase_return)} · ${totals.purchase_return_invoices} returns · ${pctText(totals.purchase_return_pct)} of purchase`,
      store: {
        rows: sorted("purchase_return"),
        columns: [
          storeCol,
          { label: "PR", get: (r) => money(r.purchase_return), numeric: true, bold: true, total: money(totals.purchase_return) },
          { label: "Returns", get: (r) => r.purchase_return_invoices, numeric: true, total: totals.purchase_return_invoices },
        ],
      },
      day: [dayCol, { label: "PR", get: (r) => money(r.purchase_return), numeric: true }],
    },
    stock: {
      title: "Stock (at cost)",
      sub: `${money(totals.stock_cost)} at landing cost · MRP value ${money(totals.stock_mrp)} · stock now, not for the chosen dates`,
      store: {
        rows: sorted("stock_cost"),
        columns: [
          storeCol,
          { label: "At cost", get: (r) => money(r.stock_cost), numeric: true, bold: true, total: money(totals.stock_cost) },
          { label: "Main (sellable)", get: (r) => money(r.stock_sellable_cost), numeric: true, total: money(totals.stock_sellable_cost) },
          { label: "MRP value", get: (r) => money(r.stock_mrp), numeric: true, total: money(totals.stock_mrp) },
        ],
      },
    },
    margin: {
      title: "Margin",
      sub: `${money(totals.margin)} · ${pctText(totals.margin_pct)} on ${money(totals.costed_sales)} of sales with a cost (before tax)`,
      store: {
        rows: sorted("margin"),
        columns: [
          storeCol,
          { label: "Margin", get: (r) => money(r.margin), numeric: true, bold: true, total: money(totals.margin) },
          { label: "Margin %", get: (r) => pctText(r.margin_pct), numeric: true, total: pctText(totals.margin_pct) },
          { label: "Sales (costed, ex tax)", get: (r) => money(r.costed_sales), numeric: true, total: money(totals.costed_sales) },
        ],
      },
    },
    debit_note: {
      title: "Debit notes",
      sub: `${money(pr.totals.debit_note)} · ${pr.totals.debit_notes} notes${
        pr.totals.debit_note_pct !== null ? ` · ${pr.totals.debit_note_pct}% of purchases` : ""
      } · raised against purchase returns`,
      store: {
        rows: pr.byStore,
        columns: [
          storeCol,
          { label: "Debit notes", get: (r) => valueCount(r.debit_note, r.debit_notes), numeric: true, total: valueCount(pr.totals.debit_note, pr.totals.debit_notes) },
        ],
      },
      extra: (
        <>
          {pr.topSuppliers.length ? (
            <>
              <Heading>Top suppliers by debit note value</Heading>
              <SimpleTable
                columns={[
                  { label: "Supplier", get: (r) => r.name },
                  { label: "Notes", get: (r) => r.notes, numeric: true },
                  { label: "Value", get: (r) => money(r.value), numeric: true },
                ]}
                rows={pr.topSuppliers}
              />
            </>
          ) : null}
          <ItemList title="Every debit note" rows={pr.debitNotes} empty="No debit notes raised in this period." />
        </>
      ),
    },
    replacement: {
      title: "Replacements",
      sub: `${money(pr.totals.replacement)} · ${pr.totals.replacements} claims · raised against purchase returns`,
      store: {
        rows: pr.byStore,
        columns: [
          storeCol,
          {
            label: "Replacements",
            get: (r) => valueCount(r.replacement, r.replacements),
            numeric: true,
            total: valueCount(pr.totals.replacement, pr.totals.replacements),
          },
        ],
      },
      extra: <ItemList title="Every replacement" rows={pr.replacements} empty="No replacements raised in this period." />,
    },
  };
}

/**
 * The drawer a top tile opens. `metric` is the tile's key, or null for none.
 * @param range  the dashboard's period; storeName the chosen store or "All stores"
 */
export default function TileDrawer({ metric, onClose, range, storeName, totals, byStore, byDay, pr }) {
  const all = sections({ totals, byStore, pr });
  const s = metric ? all[metric] : null;
  const scope = `${storeName} · ${metric === "stock" ? "now" : periodText(range)}`;
  return (
    <SideDrawer isOpen={Boolean(s)} onClose={onClose} title={s ? s.title : ""} sub={s ? `${scope} · ${s.sub}` : ""}>
      {s ? (
        <>
          <Heading>By store</Heading>
          {s.store.rows.length ? (
            <SimpleTable columns={s.store.columns} rows={s.store.rows} />
          ) : (
            <Text fontSize="sm" color="gray.500">
              No stores to show.
            </Text>
          )}
          {s.extra || null}
          {s.day && byDay.length > 1 ? (
            <>
              <Heading>By day</Heading>
              <SimpleTable columns={s.day} rows={byDay} />
            </>
          ) : null}
        </>
      ) : null}
    </SideDrawer>
  );
}
