"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { labelToStatus, parseCopy } from "@/lib/config";
import { ICON_NAMES } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { clearSession, createSession } from "@/lib/session";
import { parseTheme } from "@/lib/theme";
import { num } from "@/lib/format";
import type { ActionResult, SiteCopy, ThemeSettings } from "@/lib/types";
import { clampPct, parseTiers } from "@/lib/validators";

async function authed() {
  return getAdmin();
}

function denied(): ActionResult {
  return { ok: false, error: "You need to sign in again." };
}

function failure(error: unknown, fallback: string): ActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, error: "That value is already in use." };
  }
  return { ok: false, error: fallback };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
}

function iconOr(value: string) {
  return (ICON_NAMES as readonly string[]).includes(value) ? value : "layers";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user?.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false as const, error: "Those details do not match an active admin." };
  }
  await createSession(user.id);
  return { ok: true as const };
}

export async function logout() {
  await clearSession();
  revalidatePath("/admin");
}

export async function updateBrand(input: {
  brandName: string;
  brandTag: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  website: string;
  logoUrl: string;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if (!input.brandName.trim()) return { ok: false, error: "Brand name is required." };
  try {
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        brandName: input.brandName.trim(),
        brandTag: input.brandTag.trim(),
        phone: input.phone.trim(),
        whatsapp: input.whatsapp.replace(/[^\d]/g, ""),
        email: input.email.trim(),
        instagram: input.instagram.trim(),
        website: input.website.trim(),
        logoUrl: input.logoUrl.trim() || "/brand-logo.png",
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save brand details.");
  }
}

export async function updateCopy(input: SiteCopy): Promise<ActionResult> {
  if (!(await authed())) return denied();
  try {
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: { copy: parseCopy(input) },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save the page copy.");
  }
}

export async function updateTheme(input: ThemeSettings): Promise<ActionResult> {
  if (!(await authed())) return denied();
  try {
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: { theme: parseTheme(input) },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save the theme.");
  }
}

export async function updateVideoRules(input: {
  videoMinSec: number;
  videoMaxSec: number;
  durDiscMinSec: number;
  durDiscPct: number;
  qtyDiscAbove: number;
  qtyDiscMinSec: number;
  qtyDiscPct: number;
  stackDiscounts: boolean;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const videoMinSec = Math.max(1, Math.round(num(input.videoMinSec)) || 7);
  const videoMaxSec = Math.max(videoMinSec + 5, Math.round(num(input.videoMaxSec)) || 120);
  try {
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        videoMinSec,
        videoMaxSec,
        durDiscMinSec: Math.max(1, Math.round(num(input.durDiscMinSec))),
        durDiscPct: clampPct(num(input.durDiscPct)),
        qtyDiscAbove: Math.max(0, Math.round(num(input.qtyDiscAbove))),
        qtyDiscMinSec: Math.max(1, Math.round(num(input.qtyDiscMinSec))),
        qtyDiscPct: clampPct(num(input.qtyDiscPct)),
        stackDiscounts: Boolean(input.stackDiscounts),
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save video pricing.");
  }
}

export async function updateOffers(input: {
  bundleMin: number;
  bundlePct: number;
  gstRate: number;
  validDays: number;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  try {
    await prisma.siteSettings.update({
      where: { id: "default" },
      data: {
        bundleMin: Math.max(1, Math.round(num(input.bundleMin))),
        bundlePct: clampPct(num(input.bundlePct)),
        gstRate: Math.min(100, num(input.gstRate)),
        validDays: Math.max(1, Math.round(num(input.validDays)) || 1),
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save offers.");
  }
}

async function reorder(kind: "style" | "resolution" | "service", id: string, direction: "up" | "down") {
  const rows: { id: string }[] =
    kind === "style"
      ? await prisma.videoStyle.findMany({ orderBy: { sort: "asc" }, select: { id: true } })
      : kind === "resolution"
        ? await prisma.videoResolution.findMany({ orderBy: { sort: "asc" }, select: { id: true } })
        : await prisma.service.findMany({ orderBy: { sort: "asc" }, select: { id: true } });
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return;
  const next = rows.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  await prisma.$transaction(
    next.map((row, sort) => {
      if (kind === "style") return prisma.videoStyle.update({ where: { id: row.id }, data: { sort } });
      if (kind === "resolution") {
        return prisma.videoResolution.update({ where: { id: row.id }, data: { sort } });
      }
      return prisma.service.update({ where: { id: row.id }, data: { sort } });
    }),
  );
}

export async function moveItem(
  kind: "style" | "resolution" | "service",
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  if (!(await authed())) return denied();
  await reorder(kind, id, direction);
  refresh();
  return { ok: true };
}

export async function createResolution(): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const count = await prisma.videoResolution.count();
  await prisma.videoResolution.create({
    data: {
      key: `r${Date.now().toString(36)}`,
      label: "New",
      detail: "Custom",
      rate: 0,
      editRate: 0,
      sort: count,
      active: true,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateResolution(input: {
  id: string;
  label: string;
  detail: string;
  rate: number;
  editRate: number;
  active: boolean;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if (!input.label.trim()) return { ok: false, error: "Resolution name is required." };
  try {
    await prisma.videoResolution.update({
      where: { id: input.id },
      data: {
        label: input.label.trim(),
        detail: input.detail.trim(),
        rate: num(input.rate),
        editRate: num(input.editRate),
        active: Boolean(input.active),
      },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save that resolution.");
  }
}

export async function deleteResolution(id: string): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if ((await prisma.videoResolution.count()) <= 1) {
    return { ok: false, error: "Keep at least one resolution." };
  }
  await prisma.videoResolution.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function createStyle(): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const count = await prisma.videoStyle.count();
  await prisma.videoStyle.create({
    data: {
      name: "New style",
      icon: "layers",
      multiplier: 1,
      description: "Describe this style.",
      sort: count,
      active: true,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateStyle(input: {
  id: string;
  name: string;
  icon: string;
  multiplier: number;
  description: string;
  active: boolean;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if (!input.name.trim()) return { ok: false, error: "Style name is required." };
  await prisma.videoStyle.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      icon: iconOr(input.icon),
      multiplier: num(input.multiplier) || 1,
      description: input.description.trim(),
      active: Boolean(input.active),
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteStyle(id: string): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if ((await prisma.videoStyle.count()) <= 1) {
    return { ok: false, error: "Keep at least one video style." };
  }
  await prisma.videoStyle.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function createService(): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const count = await prisma.service.count();
  await prisma.service.create({
    data: {
      name: "New service",
      icon: "layers",
      description: "Describe this service.",
      unit: "unit",
      qtyLabel: "units",
      price: 0,
      moq: 1,
      tierOn: "qty",
      sort: count,
      active: true,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateService(input: {
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
  tiersText: string;
  useMult: boolean;
  multLabel: string;
  multDefault: number;
  multMin: number;
  multMax: number;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  if (!input.name.trim()) return { ok: false, error: "Service name is required." };
  const multMin = Math.max(1, Math.round(num(input.multMin)) || 1);
  const multMax = Math.max(multMin, Math.round(num(input.multMax)) || multMin);
  const multDefault = Math.min(multMax, Math.max(multMin, Math.round(num(input.multDefault)) || multMin));
  try {
    await prisma.$transaction(async (tx) => {
      await tx.serviceTier.deleteMany({ where: { serviceId: input.id } });
      await tx.service.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          icon: iconOr(input.icon),
          description: input.description.trim(),
          unit: input.unit.trim() || "unit",
          qtyLabel: input.qtyLabel.trim() || "units",
          price: num(input.price),
          moq: Math.max(1, Math.round(num(input.moq)) || 1),
          tierOn: input.tierOn === "units" ? "units" : "qty",
          active: Boolean(input.active),
          multLabel: input.useMult ? input.multLabel.trim() || "Multiplier" : null,
          multDefault: input.useMult ? multDefault : null,
          multMin: input.useMult ? multMin : null,
          multMax: input.useMult ? multMax : null,
          tiers: { create: parseTiers(input.tiersText) },
        },
      });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save that service.");
  }
}

export async function deleteService(id: string): Promise<ActionResult> {
  if (!(await authed())) return denied();
  await prisma.service.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function createPromo(): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const code = `NEW${Date.now().toString(36).toUpperCase().slice(-4)}`;
  await prisma.promo.create({ data: { code, pct: 5, active: true } });
  refresh();
  return { ok: true };
}

export async function updatePromo(input: {
  id: string;
  code: string;
  pct: number;
  active: boolean;
}): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,20}$/.test(code)) {
    return { ok: false, error: "Use 2 to 20 letters or digits for the code." };
  }
  try {
    await prisma.promo.update({
      where: { id: input.id },
      data: { code, pct: clampPct(num(input.pct)), active: Boolean(input.active) },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not save that promo code.");
  }
}

export async function deletePromo(id: string): Promise<ActionResult> {
  if (!(await authed())) return denied();
  await prisma.promo.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function updateQuoteStatus(id: string, status: string): Promise<ActionResult> {
  if (!(await authed())) return denied();
  const next = labelToStatus(status);
  if (!next) return { ok: false, error: "Unknown status." };
  await prisma.quotation.update({ where: { id }, data: { status: next } });
  refresh();
  return { ok: true };
}

export async function exportQuotesCsv() {
  if (!(await authed())) return { ok: false as const, error: "You need to sign in again." };
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "asc" },
    include: { quotations: { include: { lines: { orderBy: { sort: "asc" } } }, orderBy: { createdAt: "asc" } } },
  });
  const rows = [["Date", "Name", "Mobile", "Email", "Company", "GST", "Quote ID", "Status", "Total (INR)", "Discount (INR)", "Items"]];
  for (const lead of leads) {
    if (!lead.quotations.length) {
      rows.push([
        lead.createdAt.toLocaleString("en-IN"),
        lead.name,
        lead.phone,
        lead.email,
        lead.company,
        lead.gst,
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }
    for (const quote of lead.quotations) {
      rows.push([
        quote.createdAt.toLocaleString("en-IN"),
        lead.name,
        lead.phone,
        lead.email,
        lead.company,
        lead.gst,
        quote.publicId,
        quote.status.toLowerCase(),
        String(Math.round(quote.total)),
        String(Math.round(quote.saved)),
        quote.lines.map((line) => `${line.name} (${line.meta}): ${Math.round(line.net)}`).join(" | "),
      ]);
    }
  }
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return { ok: true as const, csv };
}

export async function createAdmin(input: { email: string; password: string }): Promise<ActionResult> {
  const actor = await authed();
  if (!actor) return denied();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.password.length < 8) return { ok: false, error: "Use at least 8 characters for the password." };
  try {
    await prisma.adminUser.create({
      data: { email, passwordHash: await bcrypt.hash(input.password, 12), active: true },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not add that admin.");
  }
}

export async function setAdminActive(id: string, active: boolean): Promise<ActionResult> {
  const actor = await authed();
  if (!actor) return denied();
  if (!active) {
    const others = await prisma.adminUser.count({ where: { active: true, NOT: { id } } });
    if (others < 1) return { ok: false, error: "Keep at least one active admin." };
  }
  await prisma.adminUser.update({ where: { id }, data: { active } });
  refresh();
  return { ok: true };
}
