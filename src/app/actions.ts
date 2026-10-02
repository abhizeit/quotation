"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { loadPublicConfig } from "@/lib/config";
import { newQid } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { calcTotals } from "@/lib/pricing";
import { quoteText } from "@/lib/quote-text";
import type { LeadInput, ServiceDraft, VideoDraft } from "@/lib/types";
import { validateLead } from "@/lib/validators";

export async function createLead(input: LeadInput) {
  const { data, errors } = validateLead(input);
  if (Object.keys(errors).length) return { ok: false as const, errors };
  try {
    const lead = await prisma.lead.create({ data });
    return {
      ok: true as const,
      lead: { id: lead.id, ...data },
    };
  } catch {
    return {
      ok: false as const,
      errors: { name: "Could not save your details. Try again." } as Partial<Record<keyof LeadInput, string>>,
    };
  }
}

export async function saveQuote(input: {
  leadId: string;
  publicId: string;
  promo: string;
  videos: VideoDraft[];
  services: ServiceDraft[];
}) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      return { ok: false as const, error: "We could not find this client. Please enter your details again." };
    }
    const cfg = await loadPublicConfig();
    if (!cfg) return { ok: false as const, error: "Pricing is not ready yet." };
    const result = calcTotals(cfg, input.videos, input.services, input.promo);
    if (!result.ok) return result;
    if (!result.totals.rows.length) {
      return { ok: false as const, error: "Add something to your quote first." };
    }

    let publicId = /^MF-[A-Z0-9]{4,12}$/.test(input.publicId) ? input.publicId : newQid();
    const taken = await prisma.quotation.findUnique({ where: { publicId } });
    if (taken && taken.leadId !== lead.id) publicId = newQid();

    const promoCode = result.totals.promo?.code ?? "";
    const leadInput = {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      gst: lead.gst,
    };
    const text = quoteText(cfg, leadInput, publicId, result.totals, promoCode);
    const snapshot = {
      config: cfg,
      total: result.totals.total,
      saved: result.totals.saved,
    } as Prisma.InputJsonValue;
    const lineData = result.totals.rows.map((row, sort) => ({
      source: row.cat,
      name: row.name,
      meta: row.meta,
      gross: row.gross,
      pct: row.pct,
      discount: row.disc,
      net: row.net,
      inputs: row.inputs as Prisma.InputJsonValue,
      sort,
    }));
    const amounts = {
      promoCode,
      gross: result.totals.gross,
      itemDisc: result.totals.itemDisc,
      bundleDisc: result.totals.bundleDisc,
      promoDisc: result.totals.promoDisc,
      gst: result.totals.gst,
      total: result.totals.total,
      saved: result.totals.saved,
      snapshot,
    };

    await prisma.$transaction(async (tx) => {
      const current = await tx.quotation.findUnique({ where: { publicId } });
      if (current) {
        await tx.quotationLine.deleteMany({ where: { quotationId: current.id } });
        await tx.quotation.update({
          where: { id: current.id },
          data: { ...amounts, lines: { create: lineData } },
        });
        return;
      }
      await tx.quotation.create({
        data: { publicId, leadId: lead.id, ...amounts, lines: { create: lineData } },
      });
    });

    revalidatePath("/admin");
    return {
      ok: true as const,
      publicId,
      total: result.totals.total,
      text,
      promoApplied: Boolean(result.totals.promo),
    };
  } catch {
    return { ok: false as const, error: "Could not save the quote. Try again." };
  }
}
