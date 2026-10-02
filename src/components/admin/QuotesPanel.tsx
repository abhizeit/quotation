"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportQuotesCsv, updateQuoteStatus } from "@/app/admin/actions";
import type { AdminLead } from "@/lib/admin-types";
import { fmt, phoneHref, whatsappHref } from "@/lib/format";
import type { QuoteStatusLabel } from "@/lib/types";

const STATUSES: QuoteStatusLabel[] = ["new", "contacted", "won", "lost"];

export function QuotesPanel({ leads }: { leads: AdminLead[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuoteStatusLabel>("all");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads
      .map((lead) => ({
        ...lead,
        quotations: lead.quotations.filter((quote) => status === "all" || quote.status === status),
      }))
      .filter((lead) => {
        if (status !== "all" && lead.quotations.length === 0) return false;
        if (!needle) return true;
        const blob = [
          lead.name,
          lead.email,
          lead.phone,
          lead.company,
          lead.gst,
          ...lead.quotations.map((quote) => quote.publicId),
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
  }, [leads, query, status]);

  return (
    <div className="af">
      <h3>Quotations</h3>
      <p className="note">
        Every quote is saved when a client sends it on WhatsApp, email, or copies it. Price changes later do not
        rewrite these totals.
      </p>
      <div className="filters">
        <input
          type="search"
          placeholder="Search name, phone, email, quote"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search quotations"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value as "all" | QuoteStatusLabel)}>
          <option value="all">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          className="btn ghost small"
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const result = await exportQuotesCsv();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              const blob = new Blob([result.csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "metaafashion-quotes.csv";
              link.click();
              URL.revokeObjectURL(url);
            });
          }}
        >
          Export CSV
        </button>
      </div>
      {error ? <p className="err">{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        {!visible.length ? <p className="note">No clients match this view yet.</p> : null}
        {visible.map((lead) => {
          const latest = lead.quotations[0];
          return (
            <div className="lead-i" key={lead.id}>
              <div className="lead-r">
                <div>
                  <b>{lead.name}</b>
                  <small>
                    {lead.company || "No company"}
                    {lead.gst ? `, GST ${lead.gst}` : ""}
                  </small>
                </div>
                <div className="lk">
                  <a href={phoneHref(lead.phone)}>{lead.phone}</a>
                  <a href={whatsappHref(lead.phone)} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </div>
                <div className="lt">{latest ? fmt(latest.total) : "No quote"}</div>
              </div>
              <details>
                <summary>
                  {lead.quotations.length} quote{lead.quotations.length === 1 ? "" : "s"}, added{" "}
                  {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                </summary>
                {lead.quotations.map((quote) => (
                  <div className="qbox" key={quote.id}>
                    <b>{quote.publicId}</b> total {fmt(quote.total)}
                    {quote.saved ? `, saved ${fmt(quote.saved)}` : ""}
                    {quote.promoCode ? `, promo ${quote.promoCode}` : ""}
                    <div className="filters">
                      <select
                        aria-label={`Status for ${quote.publicId}`}
                        value={quote.status}
                        onChange={(event) => {
                          const next = event.target.value;
                          start(async () => {
                            const result = await updateQuoteStatus(quote.id, next);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      >
                        {STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <small>{new Date(quote.createdAt).toLocaleString("en-IN")}</small>
                    </div>
                    <ul>
                      {quote.lines.map((line, index) => (
                        <li key={`${quote.id}-${index}`}>
                          {line.name} ({line.meta}): {fmt(line.net)}
                          {line.pct ? ` after ${line.pct}% off` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
