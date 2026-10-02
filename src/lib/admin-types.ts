import type { QuoteStatusLabel, SiteCopy, ThemeSettings } from "./types";

export type AdminResolution = {
  id: string;
  key: string;
  label: string;
  detail: string;
  rate: number;
  editRate: number;
  sort: number;
  active: boolean;
};

export type AdminStyle = {
  id: string;
  name: string;
  icon: string;
  multiplier: number;
  description: string;
  sort: number;
  active: boolean;
};

export type AdminService = {
  id: string;
  name: string;
  icon: string;
  description: string;
  unit: string;
  qtyLabel: string;
  price: number;
  moq: number;
  tierOn: "qty" | "units";
  active: boolean;
  sort: number;
  tiers: { min: number; pct: number }[];
  mult: { label: string; def: number; min: number; max: number } | null;
};

export type AdminPromo = {
  id: string;
  code: string;
  pct: number;
  active: boolean;
};

export type AdminSettings = {
  brandName: string;
  brandTag: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  website: string;
  logoUrl: string;
  copy: SiteCopy;
  theme: ThemeSettings;
  videoMinSec: number;
  videoMaxSec: number;
  durDiscMinSec: number;
  durDiscPct: number;
  qtyDiscAbove: number;
  qtyDiscMinSec: number;
  qtyDiscPct: number;
  stackDiscounts: boolean;
  bundleMin: number;
  bundlePct: number;
  gstRate: number;
  validDays: number;
};

export type AdminQuote = {
  id: string;
  publicId: string;
  total: number;
  saved: number;
  status: QuoteStatusLabel;
  promoCode: string;
  createdAt: string;
  lines: { name: string; meta: string; net: number; gross: number; pct: number }[];
};

export type AdminLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  gst: string;
  createdAt: string;
  quotations: AdminQuote[];
};

export type AdminAccount = {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
};

export type AdminData = {
  user: { id: string; email: string };
  settings: AdminSettings;
  styles: AdminStyle[];
  resolutions: AdminResolution[];
  services: AdminService[];
  promos: AdminPromo[];
  leads: AdminLead[];
  admins: AdminAccount[];
};
