import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultCopy, defaultTheme } from "../src/lib/defaults";

const prisma = new PrismaClient();

const styles = [
  {
    id: "fashion",
    name: "Fashion AI videos",
    icon: "star",
    multiplier: 1,
    description:
      "Runway-style clips made from your flat lays and garments, with AI models, fabric movement and styling.",
    sort: 0,
  },
  {
    id: "ugc",
    name: "UGC AI videos",
    icon: "user",
    multiplier: 1,
    description:
      "Creator-style try-ons, reviews and unboxings that feel real, without booking a single creator.",
    sort: 1,
  },
  {
    id: "motion",
    name: "Motion graphics AI videos",
    icon: "zap",
    multiplier: 1,
    description:
      "Animated offers, product callouts and brand reveals that stop the scroll in the first second.",
    sort: 2,
  },
  {
    id: "cinematic",
    name: "Cinematic AI videos",
    icon: "film",
    multiplier: 1,
    description: "Story-led brand films with film-grade camera moves, lighting and sound.",
    sort: 3,
  },
];

const resolutions = [
  { id: "res-720", key: "r720", label: "720p", detail: "HD", rate: 300, editRate: 50, sort: 0 },
  { id: "res-1080", key: "r1080", label: "1080p", detail: "Full HD", rate: 400, editRate: 50, sort: 1 },
  { id: "res-4k", key: "r4k", label: "4K", detail: "Ultra HD", rate: 500, editRate: 50, sort: 2 },
];

type SeedService = {
  id: string;
  name: string;
  icon: string;
  description: string;
  unit: string;
  qtyLabel: string;
  price: number;
  moq: number;
  tierOn: string;
  sort: number;
  tiers: { min: number; pct: number }[];
  mult?: { label: string; def: number; min: number; max: number };
};

const services: SeedService[] = [
  {
    id: "post",
    name: "Social media post",
    icon: "image",
    description: "A scroll-stopping static post designed to your brand.",
    unit: "post",
    qtyLabel: "posts",
    price: 500,
    moq: 1,
    tiers: [{ min: 10, pct: 10 }],
    tierOn: "qty",
    sort: 0,
  },
  {
    id: "carousel",
    name: "Carousel",
    icon: "layers",
    description: "A swipeable multi-slide story for Instagram and LinkedIn.",
    unit: "carousel",
    qtyLabel: "carousels",
    price: 1500,
    moq: 1,
    tiers: [{ min: 5, pct: 10 }],
    tierOn: "qty",
    sort: 1,
  },
  {
    id: "poster",
    name: "Poster",
    icon: "pen",
    description: "Campaign, sale and event posters ready for print or screen.",
    unit: "poster",
    qtyLabel: "posters",
    price: 800,
    moq: 1,
    tiers: [{ min: 10, pct: 10 }],
    tierOn: "qty",
    sort: 2,
  },
  {
    id: "catalogue",
    name: "Catalogue",
    icon: "book",
    description: "Product catalogue laid out page by page, digital and print ready.",
    unit: "page",
    qtyLabel: "pages",
    price: 400,
    moq: 10,
    tiers: [{ min: 30, pct: 10 }],
    tierOn: "qty",
    sort: 3,
  },
  {
    id: "shoot",
    name: "E-commerce AI photoshoot",
    icon: "camera",
    description: "Studio-quality product images for your store, without a physical shoot.",
    unit: "image",
    qtyLabel: "products",
    price: 200,
    moq: 5,
    mult: { label: "Images per product", def: 3, min: 1, max: 20 },
    tiers: [{ min: 30, pct: 10 }],
    tierOn: "units",
    sort: 4,
  },
  {
    id: "logo",
    name: "Logo design",
    icon: "star",
    description: "A distinctive logo with variations and usage files.",
    unit: "logo",
    qtyLabel: "logos",
    price: 5000,
    moq: 1,
    tiers: [],
    tierOn: "qty",
    sort: 5,
  },
  {
    id: "brand",
    name: "Brand identity kit",
    icon: "layers",
    description: "Colours, typography and guidelines that keep every post consistent.",
    unit: "kit",
    qtyLabel: "kits",
    price: 12000,
    moq: 1,
    tiers: [],
    tierOn: "qty",
    sort: 6,
  },
  {
    id: "web",
    name: "Website graphics",
    icon: "globe",
    description: "Banners, hero visuals and web assets that match your brand.",
    unit: "graphic",
    qtyLabel: "graphics",
    price: 700,
    moq: 1,
    tiers: [{ min: 10, pct: 10 }],
    tierOn: "qty",
    sort: 7,
  },
  {
    id: "smm",
    name: "Social media management",
    icon: "share",
    description: "Planning, posting and upkeep on Instagram, LinkedIn and Facebook.",
    unit: "platform per month",
    qtyLabel: "months",
    price: 15000,
    moq: 1,
    mult: { label: "Platforms", def: 3, min: 1, max: 3 },
    tiers: [{ min: 3, pct: 10 }],
    tierOn: "qty",
    sort: 8,
  },
  {
    id: "cmumkndkc5eud",
    name: "web website devlopment ",
    icon: "layers",
    description: "Describe this service.",
    unit: "unit",
    qtyLabel: "units",
    price: 0,
    moq: 1,
    tiers: [],
    tierOn: "qty",
    sort: 9,
  },
  {
    id: "cmumko15f0h7s",
    name: "MARKETING ",
    icon: "layers",
    description: "Describe this service.",
    unit: "unit",
    qtyLabel: "units",
    price: 0,
    moq: 1,
    tiers: [],
    tierOn: "qty",
    sort: 10,
  },
  {
    id: "cmumkoaqkjbux",
    name: "CAMERA PHOTOSHOOTS ",
    icon: "layers",
    description: "Describe this service.",
    unit: "unit",
    qtyLabel: "units",
    price: 0,
    moq: 1,
    tiers: [],
    tierOn: "qty",
    sort: 11,
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.");
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    await prisma.siteSettings.create({
      data: {
        id: "default",
        brandName: "metaafashion",
        brandTag: "AI Content Agency",
        phone: "7979957160",
        whatsapp: "917979957160",
        email: "thekaushalpkd@gmail.com",
        instagram: "https://www.instagram.com/metaafashion/",
        website: "",
        logoUrl: "/brand-logo.png",
        copy: defaultCopy(),
        theme: defaultTheme(),
        videoMinSec: 7,
        videoMaxSec: 120,
        durDiscMinSec: 30,
        durDiscPct: 15,
        qtyDiscAbove: 10,
        qtyDiscMinSec: 20,
        qtyDiscPct: 25,
        stackDiscounts: true,
        bundleMin: 3,
        bundlePct: 5,
        gstRate: 18,
        validDays: 7,
      },
    });
  }

  if ((await prisma.videoStyle.count()) === 0) {
    await prisma.videoStyle.createMany({ data: styles });
  }
  if ((await prisma.videoResolution.count()) === 0) {
    await prisma.videoResolution.createMany({ data: resolutions });
  }
  if ((await prisma.service.count()) === 0) {
    for (const service of services) {
      await prisma.service.create({
        data: {
          id: service.id,
          name: service.name,
          icon: service.icon,
          description: service.description,
          unit: service.unit,
          qtyLabel: service.qtyLabel,
          price: service.price,
          moq: service.moq,
          tierOn: service.tierOn,
          sort: service.sort,
          multLabel: service.mult?.label,
          multDefault: service.mult?.def,
          multMin: service.mult?.min,
          multMax: service.mult?.max,
          tiers: { create: service.tiers },
        },
      });
    }
  }
  if ((await prisma.promo.count()) === 0) {
    await prisma.promo.create({ data: { code: "WELCOME5", pct: 5, active: true } });
  }
  if ((await prisma.adminUser.count()) === 0) {
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
