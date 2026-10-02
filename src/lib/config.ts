import type { Prisma, QuoteStatus } from "@prisma/client";
import type { AdminData, AdminService } from "./admin-types";
import { defaultCopy } from "./defaults";
import { prisma } from "./prisma";
import { parseTheme } from "./theme";
import type { PublicConfig, QuoteStatusLabel, ServicePublic, SiteCopy } from "./types";

const statusToLabel: Record<QuoteStatus, QuoteStatusLabel> = {
  NEW: "new",
  CONTACTED: "contacted",
  WON: "won",
  LOST: "lost",
};

export function labelToStatus(label: string): QuoteStatus | null {
  if (label === "new") return "NEW";
  if (label === "contacted") return "CONTACTED";
  if (label === "won") return "WON";
  if (label === "lost") return "LOST";
  return null;
}

export function parseCopy(value: unknown): SiteCopy {
  const copy = defaultCopy();
  if (!value || typeof value !== "object") return copy;
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(copy) as (keyof SiteCopy)[]) {
    if (typeof source[key] === "string") copy[key] = source[key];
  }
  return copy;
}

type ServiceWithTiers = Prisma.ServiceGetPayload<{ include: { tiers: true } }>;

function toServicePublic(service: ServiceWithTiers): ServicePublic {
  const tierOn = service.tierOn === "units" ? "units" : "qty";
  const hasMult =
    service.multLabel &&
    service.multDefault != null &&
    service.multMin != null &&
    service.multMax != null;
  return {
    id: service.id,
    name: service.name,
    icon: service.icon,
    desc: service.description,
    unit: service.unit,
    qtyLabel: service.qtyLabel,
    price: service.price,
    moq: service.moq,
    tierOn,
    tiers: service.tiers
      .map((tier) => ({ min: tier.min, pct: tier.pct }))
      .sort((a, b) => a.min - b.min),
    mult: hasMult
      ? {
          label: service.multLabel as string,
          def: service.multDefault as number,
          min: service.multMin as number,
          max: service.multMax as number,
        }
      : undefined,
  };
}

function toAdminService(service: ServiceWithTiers): AdminService {
  const pub = toServicePublic(service);
  return {
    id: service.id,
    name: service.name,
    icon: service.icon,
    description: service.description,
    unit: service.unit,
    qtyLabel: service.qtyLabel,
    price: service.price,
    moq: service.moq,
    tierOn: pub.tierOn,
    active: service.active,
    sort: service.sort,
    tiers: pub.tiers,
    mult: pub.mult ?? null,
  };
}

async function loadCatalog() {
  const [settings, styles, resolutions, services, promos] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.videoStyle.findMany({ orderBy: { sort: "asc" } }),
    prisma.videoResolution.findMany({ orderBy: { sort: "asc" } }),
    prisma.service.findMany({ include: { tiers: true }, orderBy: { sort: "asc" } }),
    prisma.promo.findMany({ orderBy: { code: "asc" } }),
  ]);
  return { settings, styles, resolutions, services, promos };
}

export async function loadPublicConfig(): Promise<PublicConfig | null> {
  const { settings, styles, resolutions, services, promos } = await loadCatalog();
  if (!settings) return null;
  return {
    brand: {
      name: settings.brandName,
      tag: settings.brandTag,
      phone: settings.phone,
      wa: settings.whatsapp,
      email: settings.email,
      insta: settings.instagram,
      website: settings.website,
      logoUrl: settings.logoUrl,
    },
    copy: parseCopy(settings.copy),
    video: {
      styles: styles
        .filter((style) => style.active)
        .map((style) => ({
          id: style.id,
          name: style.name,
          icon: style.icon,
          mult: style.multiplier,
          desc: style.description,
        })),
      resolutions: resolutions
        .filter((item) => item.active)
        .map((item) => ({
          key: item.key,
          label: item.label,
          detail: item.detail,
          rate: item.rate,
          editRate: item.editRate,
        })),
      minSec: settings.videoMinSec,
      maxSec: settings.videoMaxSec,
      durDisc: { minSec: settings.durDiscMinSec, pct: settings.durDiscPct },
      qtyDisc: {
        above: settings.qtyDiscAbove,
        minSec: settings.qtyDiscMinSec,
        pct: settings.qtyDiscPct,
      },
      stack: settings.stackDiscounts,
    },
    services: services.filter((service) => service.active).map(toServicePublic),
    bundle: { min: settings.bundleMin, pct: settings.bundlePct },
    promos: promos
      .filter((promo) => promo.active)
      .map((promo) => ({ code: promo.code, pct: promo.pct })),
    gst: { rate: settings.gstRate },
    validDays: settings.validDays,
  };
}

export async function loadThemeSettings() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) return null;
  return parseTheme(settings.theme);
}

export async function loadAdminData(userId: string): Promise<AdminData | null> {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user?.active) return null;
  const { settings, styles, resolutions, services, promos } = await loadCatalog();
  if (!settings) return null;
  const [leads, admins] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        quotations: {
          orderBy: { createdAt: "desc" },
          include: { lines: { orderBy: { sort: "asc" } } },
        },
      },
    }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return {
    user: { id: user.id, email: user.email },
    settings: {
      brandName: settings.brandName,
      brandTag: settings.brandTag,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      instagram: settings.instagram,
      website: settings.website,
      logoUrl: settings.logoUrl,
      copy: parseCopy(settings.copy),
      theme: parseTheme(settings.theme),
      videoMinSec: settings.videoMinSec,
      videoMaxSec: settings.videoMaxSec,
      durDiscMinSec: settings.durDiscMinSec,
      durDiscPct: settings.durDiscPct,
      qtyDiscAbove: settings.qtyDiscAbove,
      qtyDiscMinSec: settings.qtyDiscMinSec,
      qtyDiscPct: settings.qtyDiscPct,
      stackDiscounts: settings.stackDiscounts,
      bundleMin: settings.bundleMin,
      bundlePct: settings.bundlePct,
      gstRate: settings.gstRate,
      validDays: settings.validDays,
    },
    styles: styles.map((style) => ({
      id: style.id,
      name: style.name,
      icon: style.icon,
      multiplier: style.multiplier,
      description: style.description,
      sort: style.sort,
      active: style.active,
    })),
    resolutions: resolutions.map((item) => ({
      id: item.id,
      key: item.key,
      label: item.label,
      detail: item.detail,
      rate: item.rate,
      editRate: item.editRate,
      sort: item.sort,
      active: item.active,
    })),
    services: services.map(toAdminService),
    promos: promos.map((promo) => ({
      id: promo.id,
      code: promo.code,
      pct: promo.pct,
      active: promo.active,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      gst: lead.gst,
      createdAt: lead.createdAt.toISOString(),
      quotations: lead.quotations.map((quote) => ({
        id: quote.id,
        publicId: quote.publicId,
        total: quote.total,
        saved: quote.saved,
        status: statusToLabel[quote.status],
        promoCode: quote.promoCode,
        createdAt: quote.createdAt.toISOString(),
        lines: quote.lines.map((line) => ({
          name: line.name,
          meta: line.meta,
          net: line.net,
          gross: line.gross,
          pct: line.pct,
        })),
      })),
    })),
    admins: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      active: admin.active,
      createdAt: admin.createdAt.toISOString(),
    })),
  };
}
