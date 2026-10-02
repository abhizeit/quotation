import { num } from "./format";
import type {
  PublicConfig,
  QuoteRow,
  QuoteTotals,
  ServiceDraft,
  ServicePublic,
  VideoDraft,
} from "./types";

export type VideoCalc = {
  styleId: string;
  styleName: string;
  resLabel: string;
  dur: number;
  qty: number;
  rate: number;
  per: number;
  gross: number;
  pct: number;
  d1: number;
  d2: number;
  disc: number;
  net: number;
  edit: boolean;
  res: string;
};

export function vidCalc(cfg: PublicConfig, v: VideoDraft): VideoCalc | null {
  const style = cfg.video.styles.find((s) => s.id === v.styleId);
  const resolution = cfg.video.resolutions.find((r) => r.key === v.res);
  if (!style || !resolution) return null;
  const dur = Math.max(cfg.video.minSec, Math.round(v.dur) || cfg.video.minSec);
  const qty = Math.max(1, Math.round(v.qty) || 1);
  const mult = style.mult || 1;
  const rate = (num(resolution.rate) + (v.edit ? num(resolution.editRate) : 0)) * mult;
  const per = rate * dur;
  const gross = per * qty;
  const d1 = dur >= cfg.video.durDisc.minSec ? num(cfg.video.durDisc.pct) : 0;
  const d2 =
    qty > cfg.video.qtyDisc.above && dur >= cfg.video.qtyDisc.minSec
      ? num(cfg.video.qtyDisc.pct)
      : 0;
  const pct = Math.min(90, cfg.video.stack ? d1 + d2 : Math.max(d1, d2));
  const disc = (gross * pct) / 100;
  return {
    styleId: style.id,
    styleName: style.name,
    resLabel: resolution.label,
    dur,
    qty,
    rate,
    per,
    gross,
    pct,
    d1,
    d2,
    disc,
    net: gross - disc,
    edit: !!v.edit,
    res: resolution.key,
  };
}

export function svUnits(sv: ServicePublic, s: ServiceDraft) {
  const qty = Math.round(s.qty) || 0;
  const mult = sv.mult ? Math.round(s.mult) || sv.mult.def : 1;
  return { qty, m: mult, units: qty * mult };
}

export function svCalc(sv: ServicePublic, s: ServiceDraft | undefined) {
  if (!s || !s.qty) return null;
  const u = svUnits(sv, s);
  const gross = u.units * num(sv.price);
  const basis = sv.tierOn === "units" ? u.units : u.qty;
  let pct = 0;
  for (const tier of sv.tiers || []) {
    if (basis >= tier.min && tier.pct > pct) pct = tier.pct;
  }
  pct = Math.min(90, pct);
  return {
    qty: u.qty,
    m: u.m,
    units: u.units,
    gross,
    pct,
    disc: (gross * pct) / 100,
    net: gross - (gross * pct) / 100,
    basis,
  };
}

export function activePromo(cfg: PublicConfig, code: string) {
  if (!code) return null;
  const wanted = code.toUpperCase();
  return cfg.promos.find((p) => p.code.toUpperCase() === wanted) || null;
}

export function calcTotals(
  cfg: PublicConfig,
  videos: VideoDraft[],
  services: ServiceDraft[],
  promoCode: string,
): { ok: true; totals: QuoteTotals } | { ok: false; error: string } {
  const rows: QuoteRow[] = [];
  videos.forEach((video, index) => {
    const calc = vidCalc(cfg, video);
    if (!calc) {
      return;
    }
    rows.push({
      cat: "video",
      rm: `vid:${index}`,
      name: calc.styleName,
      meta: `${calc.dur} sec, ${calc.resLabel}${calc.edit ? ", with editing" : ""}, ${calc.qty} ${calc.qty > 1 ? "videos" : "video"}`,
      gross: calc.gross,
      pct: calc.pct,
      disc: calc.disc,
      net: calc.net,
      inputs: {
        styleId: calc.styleId,
        dur: calc.dur,
        res: calc.res,
        edit: calc.edit,
        qty: calc.qty,
      },
    });
  });

  if (rows.length !== videos.length) {
    return { ok: false, error: "A video in this quote is no longer available." };
  }

  for (const draft of services) {
    if (!draft.qty) continue;
    const service = cfg.services.find((item) => item.id === draft.id);
    if (!service) {
      return { ok: false, error: "A service in this quote is no longer available." };
    }
    const calc = svCalc(service, draft);
    if (!calc) continue;
    const meta = service.mult
      ? `${calc.qty} ${service.qtyLabel} x ${calc.m} ${service.mult.label.toLowerCase()}`
      : `${calc.qty} ${service.qtyLabel}`;
    rows.push({
      cat: service.id,
      rm: `sv:${service.id}`,
      name: service.name,
      meta,
      gross: calc.gross,
      pct: calc.pct,
      disc: calc.disc,
      net: calc.net,
      inputs: { serviceId: service.id, qty: calc.qty, mult: calc.m },
    });
  }

  let gross = 0;
  let itemDisc = 0;
  let sub = 0;
  for (const row of rows) {
    gross += row.gross;
    itemDisc += row.disc;
    sub += row.net;
  }
  const kinds: Record<string, true> = {};
  for (const row of rows) kinds[row.cat] = true;
  const nk = Object.keys(kinds).length;
  const bp = cfg.bundle.pct && nk >= cfg.bundle.min ? num(cfg.bundle.pct) : 0;
  const bundleDisc = (sub * bp) / 100;
  const promo = activePromo(cfg, promoCode);
  const pp = promo ? num(promo.pct) : 0;
  const promoDisc = ((sub - bundleDisc) * pp) / 100;
  const taxable = sub - bundleDisc - promoDisc;
  const gst = (taxable * num(cfg.gst.rate)) / 100;
  return {
    ok: true,
    totals: {
      rows,
      gross,
      itemDisc,
      sub,
      nk,
      bp,
      bundleDisc,
      promo,
      pp,
      promoDisc,
      taxable,
      gst,
      total: taxable + gst,
      saved: itemDisc + bundleDisc + promoDisc,
    },
  };
}

export function quickDurations(cfg: PublicConfig) {
  const values = [cfg.video.minSec, 15, cfg.video.durDisc.minSec, 60, cfg.video.maxSec];
  return values
    .filter((value, index) => value >= cfg.video.minSec && values.indexOf(value) === index)
    .sort((a, b) => a - b);
}

export function offersFor(cfg: PublicConfig) {
  const offers: { icon: string; title: string; body: string }[] = [];
  const video = cfg.video;
  if (num(video.durDisc.pct)) {
    offers.push({
      icon: "zap",
      title: "Longer videos, lower rate",
      body: `${num(video.durDisc.pct)}% off every video that runs ${video.durDisc.minSec} seconds or more.`,
    });
  }
  if (num(video.qtyDisc.pct)) {
    offers.push({
      icon: "film",
      title: "Volume discount on video",
      body: `${num(video.qtyDisc.pct)}% off when you order more than ${video.qtyDisc.above} videos of ${video.qtyDisc.minSec} seconds or more.${video.stack ? " It stacks with the length offer." : ""}`,
    });
  }
  for (const service of cfg.services) {
    if (!service.tiers.length) continue;
    const lab = service.tierOn === "units" ? `${service.unit}s` : service.qtyLabel;
    offers.push({
      icon: service.icon,
      title: service.name,
      body: `${service.tiers.map((tier) => `${tier.min}+ ${lab} saves ${tier.pct}%`).join(", ")}.`,
    });
  }
  if (num(cfg.bundle.pct)) {
    offers.push({
      icon: "gift",
      title: "Bundle bonus",
      body: `Choose ${cfg.bundle.min} or more different services and get an extra ${num(cfg.bundle.pct)}% off the total.`,
    });
  }
  if (cfg.promos.length) {
    offers.push({
      icon: "tag",
      title: "Have a promo code?",
      body: "Enter it in your quote and the discount is applied to the total.",
    });
  }
  return offers;
}
