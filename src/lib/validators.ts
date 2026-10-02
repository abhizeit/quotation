import type { LeadInput } from "./types";

export function validateLead(input: LeadInput) {
  const data: LeadInput = {
    name: input.name.trim(),
    phone: input.phone.replace(/[\s\-()]/g, ""),
    email: input.email.trim(),
    company: input.company.trim(),
    gst: input.gst.trim().toUpperCase(),
  };
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  if (data.name.length < 2) errors.name = "Enter your name.";
  if (!/^\+?\d{10,14}$/.test(data.phone)) {
    errors.phone = "Enter a valid mobile number, for example 9876543210.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (data.gst && !/^[0-9A-Z]{15}$/.test(data.gst)) {
    errors.gst = "GST number has 15 letters and digits.";
  }
  return { data, errors };
}

export function clampPct(value: number) {
  return Math.min(90, Math.max(0, value));
}

export function parseTiers(value: string) {
  const tiers: { min: number; pct: number }[] = [];
  for (const part of value.split(",")) {
    const [rawMin, rawPct] = part.trim().split(":");
    const min = parseFloat(rawMin);
    const pct = parseFloat(rawPct);
    if (Number.isFinite(min) && Number.isFinite(pct) && min > 0 && pct > 0) {
      tiers.push({ min, pct: Math.min(90, pct) });
    }
  }
  return tiers;
}

export function tiersToText(tiers: { min: number; pct: number }[]) {
  return tiers.map((tier) => `${tier.min}:${tier.pct}`).join(", ");
}
