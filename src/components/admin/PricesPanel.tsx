"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createResolution,
  createService,
  createStyle,
  deleteResolution,
  deleteService,
  deleteStyle,
  moveItem,
  updateResolution,
  updateService,
  updateStyle,
  updateVideoRules,
} from "@/app/admin/actions";
import type { AdminResolution, AdminService, AdminSettings, AdminStyle } from "@/lib/admin-types";
import { ICON_NAMES } from "@/lib/defaults";
import { tiersToText } from "@/lib/validators";
import { SaveRow, TextField } from "./ui";

export function PricesPanel({
  settings,
  resolutions,
  styles,
  services,
}: {
  settings: AdminSettings;
  resolutions: AdminResolution[];
  styles: AdminStyle[];
  services: AdminService[];
}) {
  return (
    <>
      <VideoRules settings={settings} />
      <section className="af">
        <h3>Resolutions</h3>
        <p className="note">Price per second. Editing is added on top when a client turns it on.</p>
        {resolutions.map((item, index) => (
          <ResolutionCard key={item.id} item={item} first={index === 0} last={index === resolutions.length - 1} />
        ))}
        <AddButton action={createResolution} label="Add a resolution" />
      </section>
      <section className="af">
        <h3>Video styles</h3>
        <p className="note">A rate multiplier of 1 is the standard per-second price. Hide a style to take it off the page.</p>
        {styles.map((item, index) => (
          <StyleCard key={item.id} item={item} first={index === 0} last={index === styles.length - 1} />
        ))}
        <AddButton action={createStyle} label="Add a style" />
      </section>
      <section className="af">
        <h3>Design, shoots and management</h3>
        <p className="note">Discount tiers use minimum:percent, for example 10:10, 20:15.</p>
        {services.map((item, index) => (
          <ServiceCard key={item.id} item={item} first={index === 0} last={index === services.length - 1} />
        ))}
        <AddButton action={createService} label="Add a service" />
      </section>
    </>
  );
}

function AddButton({ action, label }: { action: () => Promise<{ ok: boolean }>; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div style={{ marginTop: 14 }}>
      <button
        className="btn ghost small"
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await action();
            router.refresh();
          });
        }}
      >
        {label}
      </button>
    </div>
  );
}

function MoveButtons({
  kind,
  id,
  first,
  last,
}: {
  kind: "style" | "resolution" | "service";
  id: string;
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function move(direction: "up" | "down") {
    start(async () => {
      await moveItem(kind, id, direction);
      router.refresh();
    });
  }
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn ghost small" type="button" disabled={first || pending} onClick={() => move("up")}>
        Up
      </button>
      <button className="btn ghost small" type="button" disabled={last || pending} onClick={() => move("down")}>
        Down
      </button>
    </div>
  );
}

function VideoRules({ settings }: { settings: AdminSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    videoMinSec: settings.videoMinSec,
    videoMaxSec: settings.videoMaxSec,
    durDiscMinSec: settings.durDiscMinSec,
    durDiscPct: settings.durDiscPct,
    qtyDiscAbove: settings.qtyDiscAbove,
    qtyDiscMinSec: settings.qtyDiscMinSec,
    qtyDiscPct: settings.qtyDiscPct,
    stackDiscounts: settings.stackDiscounts,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (key: keyof typeof form, value: number | boolean) => setForm({ ...form, [key]: value });
  return (
    <div className="af">
      <h3>Video rates and discounts</h3>
      <p className="note">Length and volume discounts apply to every video style. Stacking adds the two percentages.</p>
      <div className="ag">
        <TextField label="Shortest video (sec)" type="number" value={form.videoMinSec} onChange={(v) => set("videoMinSec", Number(v))} />
        <TextField label="Slider maximum (sec)" type="number" value={form.videoMaxSec} onChange={(v) => set("videoMaxSec", Number(v))} />
        <TextField label="Length discount from (sec)" type="number" value={form.durDiscMinSec} onChange={(v) => set("durDiscMinSec", Number(v))} />
        <TextField label="Length discount %" type="number" value={form.durDiscPct} onChange={(v) => set("durDiscPct", Number(v))} />
        <TextField label="Volume discount above (videos)" type="number" value={form.qtyDiscAbove} onChange={(v) => set("qtyDiscAbove", Number(v))} />
        <TextField label="Minimum length for volume (sec)" type="number" value={form.qtyDiscMinSec} onChange={(v) => set("qtyDiscMinSec", Number(v))} />
        <TextField label="Volume discount %" type="number" value={form.qtyDiscPct} onChange={(v) => set("qtyDiscPct", Number(v))} />
        <label className="chk">
          <input
            type="checkbox"
            checked={form.stackDiscounts}
            onChange={(event) => set("stackDiscounts", event.target.checked)}
          />
          <span>Stack both discounts</span>
        </label>
      </div>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateVideoRules(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function ResolutionCard({
  item,
  first,
  last,
}: {
  item: AdminResolution;
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(item);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="srow">
      <div className="top2">
        <b>
          {form.label} <small style={{ color: "var(--muted)", fontWeight: 500 }}>{item.key}</small>
        </b>
        <MoveButtons kind="resolution" id={item.id} first={first} last={last} />
      </div>
      <div className="ag">
        <TextField label="Name" value={form.label} onChange={(label) => setForm({ ...form, label })} />
        <TextField label="Detail" value={form.detail} onChange={(detail) => setForm({ ...form, detail })} />
        <TextField label="Price per sec (INR)" type="number" value={form.rate} onChange={(v) => setForm({ ...form, rate: Number(v) })} />
        <TextField label="Editing per sec (INR)" type="number" value={form.editRate} onChange={(v) => setForm({ ...form, editRate: Number(v) })} />
        <label className="chk">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          <span>Show to client</span>
        </label>
        <div className="chk">
          <button
            className="dbtn"
            type="button"
            onClick={() => {
              if (!window.confirm("Delete this resolution?")) return;
              start(async () => {
                const result = await deleteResolution(item.id);
                setError(result.ok ? "" : result.error);
                if (result.ok) router.refresh();
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
            const result = await updateResolution(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function StyleCard({ item, first, last }: { item: AdminStyle; first: boolean; last: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(item);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="srow">
      <div className="top2">
        <b>{form.name}</b>
        <MoveButtons kind="style" id={item.id} first={first} last={last} />
      </div>
      <div className="ag">
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <label>
          <span>Icon</span>
          <select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Rate multiplier"
          type="number"
          value={form.multiplier}
          onChange={(value) => setForm({ ...form, multiplier: Number(value) })}
        />
        <label className="chk">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          <span>Show to client</span>
        </label>
        <div className="chk">
          <button
            className="dbtn"
            type="button"
            onClick={() => {
              if (!window.confirm("Delete this style?")) return;
              start(async () => {
                const result = await deleteStyle(item.id);
                setError(result.ok ? "" : result.error);
                if (result.ok) router.refresh();
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <label style={{ display: "block", marginTop: 10 }}>
        <span style={{ display: "block", fontSize: ".8rem", color: "var(--muted)", marginBottom: 4 }}>Description</span>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateStyle(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function ServiceCard({ item, first, last }: { item: AdminService; first: boolean; last: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...item,
    tiersText: tiersToText(item.tiers),
    useMult: Boolean(item.mult),
    multLabel: item.mult?.label || "",
    multDefault: item.mult?.def || 1,
    multMin: item.mult?.min || 1,
    multMax: item.mult?.max || 10,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="srow">
      <div className="top2">
        <b>{form.name}</b>
        <MoveButtons kind="service" id={item.id} first={first} last={last} />
      </div>
      <div className="ag">
        <label className="chk">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          <span>Show to client</span>
        </label>
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <label>
          <span>Icon</span>
          <select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <TextField label={`Price per ${form.unit || "unit"} (INR)`} type="number" value={form.price} onChange={(v) => setForm({ ...form, price: Number(v) })} />
        <TextField label="Unit name" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} />
        <TextField label="Quantity label" value={form.qtyLabel} onChange={(qtyLabel) => setForm({ ...form, qtyLabel })} />
        <TextField label="Minimum order" type="number" value={form.moq} onChange={(v) => setForm({ ...form, moq: Number(v) })} />
        <label>
          <span>Discount applies to</span>
          <select
            value={form.tierOn}
            onChange={(event) => setForm({ ...form, tierOn: event.target.value as "qty" | "units" })}
          >
            <option value="qty">Quantity</option>
            <option value="units">Units (quantity x multiplier)</option>
          </select>
        </label>
        <TextField label="Discount tiers" value={form.tiersText} onChange={(tiersText) => setForm({ ...form, tiersText })} />
        <label className="chk">
          <input type="checkbox" checked={form.useMult} onChange={(event) => setForm({ ...form, useMult: event.target.checked })} />
          <span>Has a multiplier</span>
        </label>
        <div className="chk">
          <button
            className="dbtn"
            type="button"
            onClick={() => {
              if (!window.confirm("Delete this service?")) return;
              start(async () => {
                const result = await deleteService(item.id);
                setError(result.ok ? "" : result.error);
                if (result.ok) router.refresh();
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {form.useMult ? (
        <div className="ag" style={{ marginTop: 10 }}>
          <TextField label="Multiplier label" value={form.multLabel} onChange={(multLabel) => setForm({ ...form, multLabel })} />
          <TextField label="Default" type="number" value={form.multDefault} onChange={(v) => setForm({ ...form, multDefault: Number(v) })} />
          <TextField label="Minimum" type="number" value={form.multMin} onChange={(v) => setForm({ ...form, multMin: Number(v) })} />
          <TextField label="Maximum" type="number" value={form.multMax} onChange={(v) => setForm({ ...form, multMax: Number(v) })} />
        </div>
      ) : null}
      <label style={{ display: "block", marginTop: 10 }}>
        <span style={{ display: "block", fontSize: ".8rem", color: "var(--muted)", marginBottom: 4 }}>Description</span>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateService(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}
