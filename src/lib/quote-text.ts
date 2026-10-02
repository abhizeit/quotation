import { fmt, num } from "./format";
import type { LeadInput, PublicConfig, QuoteTotals } from "./types";

export function quoteText(
  cfg: PublicConfig,
  lead: LeadInput,
  qid: string,
  totals: QuoteTotals,
  promoCode: string,
) {
  const lines = [
    `*Quotation request for ${cfg.brand.name}*`,
    `Quote ID: ${qid}`,
    "",
    `Name: ${lead.name || "-"}`,
    `Mobile: ${lead.phone || "-"}`,
    `Email: ${lead.email || "-"}`,
  ];
  if (lead.company) lines.push(`Company: ${lead.company}`);
  if (lead.gst) lines.push(`GST: ${lead.gst}`);
  lines.push("", "Items:");
  totals.rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.name} (${row.meta}): ${fmt(row.net)}${row.pct ? ` after ${row.pct}% off` : ""}`,
    );
  });
  lines.push("");
  if (totals.saved > 0.5) lines.push(`Total discounts: ${fmt(totals.saved)}`);
  if (totals.promo) lines.push(`Promo code: ${promoCode}`);
  if (num(cfg.gst.rate)) lines.push(`GST (${num(cfg.gst.rate)}%): ${fmt(totals.gst)}`);
  lines.push(`*Total: ${fmt(totals.total)}*`);
  return lines.join("\n");
}
