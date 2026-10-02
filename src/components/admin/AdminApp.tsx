"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/admin/actions";
import type { AdminData } from "@/lib/admin-types";
import { OffersPanel } from "./OffersPanel";
import { PagePanel } from "./PagePanel";
import { PricesPanel } from "./PricesPanel";
import { QuotesPanel } from "./QuotesPanel";
import { TeamPanel } from "./TeamPanel";

const TABS = [
  ["quotes", "Quotes"],
  ["prices", "Prices"],
  ["offers", "Offers and tax"],
  ["page", "Page"],
  ["team", "Team"],
] as const;

export function AdminApp({ data, initialTab }: { data: AdminData; initialTab: string }) {
  const router = useRouter();
  const [tab, setTab] = useState(TABS.some(([id]) => id === initialTab) ? initialTab : "quotes");

  function choose(next: string) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  return (
    <div className="admp">
      <div className="admh">
        <h2>Admin</h2>
        <div className="r">
          <span className="note">{data.user.email}</span>
          <Link className="btn ghost small" href="/">
            View site
          </Link>
          <button
            className="btn ghost small"
            type="button"
            onClick={async () => {
              await logout();
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="atabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => choose(id)}>
            {id === "quotes" ? `${label} (${data.leads.length})` : label}
          </button>
        ))}
      </div>
      {tab === "quotes" ? <QuotesPanel leads={data.leads} /> : null}
      {tab === "prices" ? (
        <PricesPanel
          settings={data.settings}
          resolutions={data.resolutions}
          styles={data.styles}
          services={data.services}
        />
      ) : null}
      {tab === "offers" ? <OffersPanel settings={data.settings} promos={data.promos} /> : null}
      {tab === "page" ? <PagePanel settings={data.settings} /> : null}
      {tab === "team" ? <TeamPanel admins={data.admins} currentId={data.user.id} /> : null}
    </div>
  );
}
