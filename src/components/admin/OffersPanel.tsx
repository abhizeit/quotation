"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPromo, deletePromo, updateOffers, updatePromo } from "@/app/admin/actions";
import type { AdminPromo, AdminSettings } from "@/lib/admin-types";
import { SaveRow, TextField } from "./ui";

export function OffersPanel({ settings, promos }: { settings: AdminSettings; promos: AdminPromo[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    bundleMin: settings.bundleMin,
    bundlePct: settings.bundlePct,
    gstRate: settings.gstRate,
    validDays: settings.validDays,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <div className="af">
        <h3>Bundle, tax, and validity</h3>
        <p className="note">GST at 0 hides the tax line. A quote stays valid for the number of days you set.</p>
        <div className="ag">
          <TextField
            label="Different services needed"
            type="number"
            value={form.bundleMin}
            onChange={(value) => setForm({ ...form, bundleMin: Number(value) })}
          />
          <TextField
            label="Bundle discount %"
            type="number"
            value={form.bundlePct}
            onChange={(value) => setForm({ ...form, bundlePct: Number(value) })}
          />
          <TextField
            label="GST % (0 hides it)"
            type="number"
            value={form.gstRate}
            onChange={(value) => setForm({ ...form, gstRate: Number(value) })}
          />
          <TextField
            label="Quote valid for (days)"
            type="number"
            value={form.validDays}
            onChange={(value) => setForm({ ...form, validDays: Number(value) })}
          />
        </div>
        <SaveRow
          pending={pending}
          error={error}
          onSave={() => {
            start(async () => {
              const result = await updateOffers(form);
              setError(result.ok ? "" : result.error);
              if (result.ok) router.refresh();
            });
          }}
        />
      </div>
      <div className="af">
        <h3>Promo codes</h3>
        <p className="note">Share a code with a client. They enter it on the quote.</p>
        {promos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
        <div style={{ marginTop: 14 }}>
          <button
            className="btn ghost small"
            type="button"
            onClick={() => {
              start(async () => {
                await createPromo();
                router.refresh();
              });
            }}
          >
            Add a promo code
          </button>
        </div>
      </div>
    </>
  );
}

function PromoCard({ promo }: { promo: AdminPromo }) {
  const router = useRouter();
  const [form, setForm] = useState(promo);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="srow">
      <div className="ag">
        <TextField label="Code" value={form.code} onChange={(code) => setForm({ ...form, code })} />
        <TextField
          label="Discount %"
          type="number"
          value={form.pct}
          onChange={(value) => setForm({ ...form, pct: Number(value) })}
        />
        <label className="chk">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          <span>Active</span>
        </label>
        <div className="chk">
          <button
            className="dbtn"
            type="button"
            onClick={() => {
              if (!window.confirm("Delete this promo code?")) return;
              start(async () => {
                const result = await deletePromo(promo.id);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updatePromo(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}
