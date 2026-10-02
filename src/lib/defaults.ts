import type { Palette, SiteCopy, ThemeSettings } from "./types";

export const darkPalette: Palette = {
  bg: "#000000",
  panel: "#0e130e",
  panel2: "#151c15",
  line: "#263326",
  text: "#f3f6f2",
  muted: "#9fac9f",
  acc: "#68b848",
  accInk: "#04110a",
  accText: "#7fd15d",
  warn: "#f2b64b",
  danger: "#ff7a6b",
};

export const lightPalette: Palette = {
  bg: "#f4f8f1",
  panel: "#ffffff",
  panel2: "#eaf1e6",
  line: "#d5e0d1",
  text: "#0a140b",
  muted: "#536355",
  acc: "#68b848",
  accInk: "#04110a",
  accText: "#2d7a19",
  warn: "#f2b64b",
  danger: "#ff7a6b",
};

export function defaultTheme(): ThemeSettings {
  return {
    mode: "system",
    fontHead: "Bricolage Grotesque",
    fontBody: "DM Sans",
    dark: { ...darkPalette },
    light: { ...lightPalette },
  };
}

export function defaultCopy(): SiteCopy {
  return {
    heroTitle: "AI content for fashion brands, priced by the second.",
    heroLead:
      "Pick a video style, length and quality. Add posts, catalogues or shoots. Your quotation builds itself while you choose.",
    ctaPrimary: "Build my quotation",
    ctaSecondary: "See what we make",
    servicesHeading: "Four ways we make video",
    servicesSub:
      "Every style is made with AI, so you get studio-quality results without a studio budget or a long wait.",
    studioHeading: "The rest of the studio",
    pricingHeading: "Build your quotation",
    pricingSub:
      "Prices update as you choose. When you are happy, send the quote to us on WhatsApp or email.",
    tabVideo: "AI videos",
    tabServices: "Design, shoots and management",
    offersHeading: "Offers that stack",
    offersSub:
      "Bigger orders cost less per piece. These apply on their own as you build your quote.",
    contactHeading: "Talk to us before you decide",
    contactSub:
      "Need a custom package or a different length? Message us and we will shape a quote around your brand.",
    gateTitle: "Before we start",
    gateBody:
      "Tell us who the quotation is for. We use these details to prepare and confirm your final price.",
    gateSubmit: "Start my quotation",
    footerNote: "Prices are indicative until confirmed by us in writing.",
    quoteTitle: "Your quote",
    emptyQuote:
      "Nothing here yet. Add a video or choose a service and your price appears here.",
    addToQuote: "Add to quote",
    sendWhatsApp: "Send on WhatsApp",
    emailLabel: "Email",
    copyQuote: "Copy quote",
    videoRateTitle: "AI video, per second",
    navServices: "Services",
    navPricing: "Pricing",
    navOffers: "Offers",
    navContact: "Contact",
  };
}

export const ICON_NAMES = [
  "star",
  "user",
  "zap",
  "film",
  "image",
  "layers",
  "pen",
  "book",
  "camera",
  "globe",
  "share",
  "gift",
  "tag",
  "play",
  "phone",
  "mail",
  "check",
  "info",
] as const;
