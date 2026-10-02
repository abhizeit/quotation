export type Palette = {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  text: string;
  muted: string;
  acc: string;
  accInk: string;
  accText: string;
  warn: string;
  danger: string;
};

export type ThemeMode = "dark" | "light" | "system";

export type ThemeSettings = {
  mode: ThemeMode;
  fontHead: string;
  fontBody: string;
  dark: Palette;
  light: Palette;
};

export type SiteCopy = {
  heroTitle: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  servicesHeading: string;
  servicesSub: string;
  studioHeading: string;
  pricingHeading: string;
  pricingSub: string;
  tabVideo: string;
  tabServices: string;
  offersHeading: string;
  offersSub: string;
  contactHeading: string;
  contactSub: string;
  gateTitle: string;
  gateBody: string;
  gateSubmit: string;
  footerNote: string;
  quoteTitle: string;
  emptyQuote: string;
  addToQuote: string;
  sendWhatsApp: string;
  emailLabel: string;
  copyQuote: string;
  videoRateTitle: string;
  navServices: string;
  navPricing: string;
  navOffers: string;
  navContact: string;
};

export type VideoStylePublic = {
  id: string;
  name: string;
  icon: string;
  mult: number;
  desc: string;
};

export type ResolutionPublic = {
  key: string;
  label: string;
  detail: string;
  rate: number;
  editRate: number;
};

export type ServiceMultiplier = {
  label: string;
  def: number;
  min: number;
  max: number;
};

export type ServicePublic = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unit: string;
  qtyLabel: string;
  price: number;
  moq: number;
  tiers: { min: number; pct: number }[];
  tierOn: "qty" | "units";
  mult?: ServiceMultiplier;
};

export type PublicConfig = {
  brand: {
    name: string;
    tag: string;
    phone: string;
    wa: string;
    email: string;
    insta: string;
    website: string;
    logoUrl: string;
  };
  copy: SiteCopy;
  video: {
    styles: VideoStylePublic[];
    resolutions: ResolutionPublic[];
    minSec: number;
    maxSec: number;
    durDisc: { minSec: number; pct: number };
    qtyDisc: { above: number; minSec: number; pct: number };
    stack: boolean;
  };
  services: ServicePublic[];
  bundle: { min: number; pct: number };
  promos: { code: string; pct: number }[];
  gst: { rate: number };
  validDays: number;
};

export type VideoDraft = {
  styleId: string;
  dur: number;
  res: string;
  edit: boolean;
  qty: number;
};

export type ServiceDraft = {
  id: string;
  qty: number;
  mult: number;
};

export type QuoteRow = {
  cat: string;
  rm: string;
  name: string;
  meta: string;
  gross: number;
  pct: number;
  disc: number;
  net: number;
  inputs: VideoDraft | { serviceId: string; qty: number; mult: number };
};

export type QuoteTotals = {
  rows: QuoteRow[];
  gross: number;
  itemDisc: number;
  sub: number;
  nk: number;
  bp: number;
  bundleDisc: number;
  promo: { code: string; pct: number } | null;
  pp: number;
  promoDisc: number;
  taxable: number;
  gst: number;
  total: number;
  saved: number;
};

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  company: string;
  gst: string;
};

export type QuoteStatusLabel = "new" | "contacted" | "won" | "lost";

export type ActionResult = { ok: true } | { ok: false; error: string };
