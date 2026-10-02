"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBrand, updateCopy, updateTheme } from "@/app/admin/actions";
import type { AdminSettings } from "@/lib/admin-types";
import type { Palette, SiteCopy, ThemeSettings } from "@/lib/types";
import { SaveRow, TextField } from "./ui";

const COPY_FIELDS: { key: keyof SiteCopy; label: string; area?: boolean }[] = [
  { key: "heroTitle", label: "Hero title", area: true },
  { key: "heroLead", label: "Hero lead", area: true },
  { key: "ctaPrimary", label: "Primary button" },
  { key: "ctaSecondary", label: "Secondary button" },
  { key: "navServices", label: "Nav: services" },
  { key: "navPricing", label: "Nav: pricing" },
  { key: "navOffers", label: "Nav: offers" },
  { key: "navContact", label: "Nav: contact" },
  { key: "servicesHeading", label: "Services heading" },
  { key: "servicesSub", label: "Services introduction", area: true },
  { key: "studioHeading", label: "Studio heading" },
  { key: "pricingHeading", label: "Pricing heading" },
  { key: "pricingSub", label: "Pricing introduction", area: true },
  { key: "tabVideo", label: "Video tab" },
  { key: "tabServices", label: "Services tab" },
  { key: "videoRateTitle", label: "Rate card title" },
  { key: "quoteTitle", label: "Quote card title" },
  { key: "emptyQuote", label: "Empty quote", area: true },
  { key: "addToQuote", label: "Add to quote button" },
  { key: "sendWhatsApp", label: "WhatsApp button" },
  { key: "emailLabel", label: "Email button" },
  { key: "copyQuote", label: "Copy button" },
  { key: "offersHeading", label: "Offers heading" },
  { key: "offersSub", label: "Offers introduction", area: true },
  { key: "contactHeading", label: "Contact heading" },
  { key: "contactSub", label: "Contact introduction", area: true },
  { key: "gateTitle", label: "Gate title" },
  { key: "gateBody", label: "Gate introduction", area: true },
  { key: "gateSubmit", label: "Gate button" },
  { key: "footerNote", label: "Footer disclaimer", area: true },
];

const COLORS: { key: keyof Palette; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "panel", label: "Panel" },
  { key: "panel2", label: "Panel alt" },
  { key: "line", label: "Line" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "acc", label: "Accent" },
  { key: "accInk", label: "Accent ink" },
  { key: "accText", label: "Accent text" },
  { key: "warn", label: "Warning" },
  { key: "danger", label: "Danger" },
];

export function PagePanel({ settings }: { settings: AdminSettings }) {
  return (
    <>
      <BrandForm settings={settings} />
      <CopyForm copy={settings.copy} />
      <ThemeForm theme={settings.theme} />
    </>
  );
}

function BrandForm({ settings }: { settings: AdminSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    brandName: settings.brandName,
    brandTag: settings.brandTag,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    instagram: settings.instagram,
    website: settings.website,
    logoUrl: settings.logoUrl,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="af">
      <h3>Brand and contact</h3>
      <p className="note">Shown on the page and used for the WhatsApp and email buttons.</p>
      <div className="ag">
        <TextField label="Name" value={form.brandName} onChange={(brandName) => setForm({ ...form, brandName })} />
        <TextField label="Tagline" value={form.brandTag} onChange={(brandTag) => setForm({ ...form, brandTag })} />
        <TextField label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <TextField label="WhatsApp with country code" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} />
        <TextField label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <TextField label="Instagram link" value={form.instagram} onChange={(instagram) => setForm({ ...form, instagram })} />
        <TextField label="Website link" value={form.website} onChange={(website) => setForm({ ...form, website })} />
        <TextField label="Logo URL" value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
      </div>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateBrand(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function CopyForm({ copy }: { copy: SiteCopy }) {
  const router = useRouter();
  const [form, setForm] = useState(copy);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="af">
      <h3>Page copy</h3>
      <p className="note">Headings, buttons, and the lead gate. Offers stay generated from the pricing rules.</p>
      <div className="ag">
        {COPY_FIELDS.map((field) =>
          field.area ? (
            <label key={field.key} style={{ gridColumn: "1 / -1" }}>
              <span>{field.label}</span>
              <textarea
                value={form[field.key]}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              />
            </label>
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              value={form[field.key]}
              onChange={(value) => setForm({ ...form, [field.key]: value })}
            />
          ),
        )}
      </div>
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateCopy(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function ThemeForm({ theme }: { theme: ThemeSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(theme);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function setColor(mode: "dark" | "light", key: keyof Palette, value: string) {
    setForm({ ...form, [mode]: { ...form[mode], [key]: value } });
  }

  return (
    <div className="af">
      <h3>Theme</h3>
      <p className="note">
        System follows the visitor&apos;s device. Dark and light force that palette. Bricolage Grotesque and DM Sans
        stay loaded; other names are used only if the browser already has them.
      </p>
      <div className="ag">
        <label>
          <span>Default appearance</span>
          <select
            value={form.mode}
            onChange={(event) => setForm({ ...form, mode: event.target.value as ThemeSettings["mode"] })}
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <TextField label="Heading font" value={form.fontHead} onChange={(fontHead) => setForm({ ...form, fontHead })} />
        <TextField label="Body font" value={form.fontBody} onChange={(fontBody) => setForm({ ...form, fontBody })} />
      </div>
      <h3 style={{ marginTop: 18 }}>Dark palette</h3>
      <PaletteFields palette={form.dark} onChange={(key, value) => setColor("dark", key, value)} />
      <h3 style={{ marginTop: 18 }}>Light palette</h3>
      <PaletteFields palette={form.light} onChange={(key, value) => setColor("light", key, value)} />
      <SaveRow
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await updateTheme(form);
            setError(result.ok ? "" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}

function PaletteFields({
  palette,
  onChange,
}: {
  palette: Palette;
  onChange: (key: keyof Palette, value: string) => void;
}) {
  return (
    <div className="ag">
      {COLORS.map((color) => (
        <label key={color.key}>
          <span>{color.label}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <input
              type="color"
              value={palette[color.key].length === 7 ? palette[color.key] : "#000000"}
              onChange={(event) => onChange(color.key, event.target.value)}
              aria-label={color.label}
              style={{ width: 46, padding: 4 }}
            />
            <input
              type="text"
              value={palette[color.key]}
              onChange={(event) => onChange(color.key, event.target.value)}
            />
          </span>
        </label>
      ))}
    </div>
  );
}
