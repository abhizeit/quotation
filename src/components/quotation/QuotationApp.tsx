"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createLead, saveQuote } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { fmt, instagramHandle, newQid, num, phoneHref } from "@/lib/format";
import { calcTotals, offersFor, quickDurations, svCalc, vidCalc } from "@/lib/pricing";
import type { LeadInput, PublicConfig, ServicePublic, VideoDraft } from "@/lib/types";

type SavedLead = LeadInput & { id: string };

const LEAD_KEY = "mf_lead";
const DRAFT_KEY = "mf_draft";

function defaultVideo(config: PublicConfig): VideoDraft {
  const resolution =
    config.video.resolutions.find((item) => item.key === "r1080") || config.video.resolutions[0];
  return {
    styleId: config.video.styles[0]?.id || "",
    dur: Math.max(config.video.minSec, 15),
    res: resolution?.key || "",
    edit: false,
    qty: 1,
  };
}

function emptyServices(config: PublicConfig) {
  const services: Record<string, { qty: number; mult: number }> = {};
  for (const service of config.services) {
    services[service.id] = { qty: 0, mult: service.mult?.def ?? 1 };
  }
  return services;
}

function displayPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `+91 ${phone}` : phone;
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function readSession(config: PublicConfig) {
  const saved = {
    lead: null as SavedLead | null,
    tab: "video" as "video" | "svc",
    vid: defaultVideo(config),
    lines: [] as VideoDraft[],
    services: emptyServices(config),
    promo: "",
    qid: null as string | null,
  };
  try {
    const storedLead = sessionStorage.getItem(LEAD_KEY);
    if (storedLead) {
      const parsed = JSON.parse(storedLead) as SavedLead;
      if (parsed?.id && parsed.name) saved.lead = parsed;
    }
    const storedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (storedDraft) {
      const draft = JSON.parse(storedDraft) as {
        tab?: "video" | "svc";
        vid?: VideoDraft;
        lines?: VideoDraft[];
        services?: Record<string, { qty: number; mult: number }>;
        promo?: string;
        qid?: string | null;
      };
      if (draft.tab === "video" || draft.tab === "svc") saved.tab = draft.tab;
      if (draft.vid?.styleId && vidCalc(config, draft.vid)) saved.vid = draft.vid;
      if (Array.isArray(draft.lines)) {
        saved.lines = draft.lines.filter((line) => vidCalc(config, line));
      }
      if (draft.services) {
        for (const id of Object.keys(saved.services)) {
          const item = draft.services[id];
          if (item) saved.services[id] = { qty: item.qty || 0, mult: item.mult || saved.services[id].mult };
        }
      }
      if (typeof draft.promo === "string") saved.promo = draft.promo;
      if (draft.qid) saved.qid = draft.qid;
    }
  } catch {
    /* ignore a broken local draft */
  }
  return saved;
}

export function QuotationApp({ config }: { config: PublicConfig }) {
  const hydrated = useHydrated();
  const [restored, setRestored] = useState(false);
  const [lead, setLead] = useState<SavedLead | null>(null);
  const [gate, setGate] = useState(true);
  const [tab, setTab] = useState<"video" | "svc">("video");
  const [vid, setVid] = useState<VideoDraft>(() => defaultVideo(config));
  const [lines, setLines] = useState<VideoDraft[]>([]);
  const [services, setServices] = useState(() => emptyServices(config));
  const [promo, setPromo] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ kind: "" | "ok" | "bad"; text: string }>({
    kind: "",
    text: "",
  });
  const [qid, setQid] = useState<string | null>(null);
  const [toastText, setToastText] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});
  const [saving, setSaving] = useState(false);
  const restoring = hydrated && !restored;
  if (restoring) {
    const saved = readSession(config);
    setLead(saved.lead);
    setGate(!saved.lead);
    setTab(saved.tab);
    setVid(saved.vid);
    setLines(saved.lines);
    setServices(saved.services);
    setPromo(saved.promo);
    setPromoInput(saved.promo);
    setQid(saved.qid);
    setRestored(true);
  }

  useEffect(() => {
    if (!restored) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ tab, vid, lines, services, promo, qid }));
  }, [restored, tab, vid, lines, services, promo, qid]);

  useEffect(() => {
    document.body.style.overflow = gate ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gate]);

  useEffect(() => {
    if (!toastOn) return;
    const timer = window.setTimeout(() => setToastOn(false), 2600);
    return () => window.clearTimeout(timer);
  }, [toastOn, toastText]);

  function toast(message: string) {
    setToastText(message);
    setToastOn(true);
  }

  const serviceDrafts = useMemo(
    () =>
      Object.entries(services).map(([id, value]) => ({
        id,
        qty: value.qty,
        mult: value.mult,
      })),
    [services],
  );
  const calculated = useMemo(
    () => calcTotals(config, lines, serviceDrafts, promo),
    [config, lines, serviceDrafts, promo],
  );
  const totals = calculated.ok ? calculated.totals : null;
  if (!restoring) {
    const validLines = lines.filter((line) => vidCalc(config, line));
    if (validLines.length !== lines.length) setLines(validLines);
    const styleOk = config.video.styles.some((item) => item.id === vid.styleId);
    const resOk = config.video.resolutions.some((item) => item.key === vid.res);
    if (config.video.styles.length && config.video.resolutions.length && (!styleOk || !resOk)) {
      setVid({
        ...defaultVideo(config),
        dur: vid.dur,
        edit: vid.edit,
        qty: vid.qty,
      });
    }
    const hasRowsNow = Boolean(totals?.rows.length);
    if (hasRowsNow && !qid) setQid(newQid());
    if (!hasRowsNow && qid) setQid(null);
    if (promo && totals && !totals.promo) setPromo("");
  }

  const videoCalc = vidCalc(config, vid);
  const offers = offersFor(config);
  const durations = quickDurations(config);
  const hasQuote = Boolean(totals && totals.rows.length);
  const totalLabel = hasQuote && totals ? fmt(totals.total) : "₹0";

  function updateVideo(patch: Partial<VideoDraft>) {
    setVid((current) => ({ ...current, ...patch }));
  }

  function addVideo() {
    if (!videoCalc) return;
    setLines((current) => [
      ...current,
      {
        styleId: videoCalc.styleId,
        dur: videoCalc.dur,
        res: videoCalc.res,
        edit: videoCalc.edit,
        qty: videoCalc.qty,
      },
    ]);
    toast("Added to your quote.");
  }

  function setServiceQty(service: ServicePublic, qty: number, clamp: boolean) {
    let next = Math.max(0, Math.round(qty) || 0);
    if (clamp && next > 0 && next < service.moq) next = service.moq;
    setServices((current) => ({
      ...current,
      [service.id]: {
        qty: next,
        mult: current[service.id]?.mult ?? service.mult?.def ?? 1,
      },
    }));
  }

  function stepService(service: ServicePublic, direction: 1 | -1) {
    const current = services[service.id]?.qty || 0;
    const next =
      direction === 1
        ? current === 0
          ? service.moq
          : current + 1
        : current <= service.moq
          ? 0
          : current - 1;
    setServiceQty(service, next, true);
  }

  function removeRow(key: string) {
    if (key.startsWith("vid:")) {
      const index = Number(key.slice(4));
      setLines((current) => current.filter((_, item) => item !== index));
      return;
    }
    const id = key.slice(3);
    setServices((current) => ({ ...current, [id]: { ...current[id], qty: 0 } }));
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoMsg({ kind: "bad", text: "Enter a promo code first." });
      return;
    }
    const match = config.promos.find((item) => item.code.toUpperCase() === code);
    if (!match) {
      setPromo("");
      setPromoMsg({ kind: "bad", text: "That code is not valid." });
      return;
    }
    setPromo(code);
    setPromoMsg({ kind: "ok", text: `Promo applied: ${match.pct}% off.` });
  }

  async function submitGate(formData: FormData) {
    const result = await createLead({
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || ""),
      gst: String(formData.get("gst") || ""),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLead(result.lead);
    sessionStorage.setItem(LEAD_KEY, JSON.stringify(result.lead));
    setGate(false);
    toast(`Welcome, ${result.lead.name.split(" ")[0]}. Build your quote below.`);
  }

  async function deliver(kind: "wa" | "mail" | "copy") {
    if (!lead || !hasQuote) {
      toast("Add something to your quote first.");
      return;
    }
    setSaving(true);
    const saved = await saveQuote({
      leadId: lead.id,
      publicId: qid || newQid(),
      promo,
      videos: lines,
      services: serviceDrafts.filter((item) => item.qty > 0),
    });
    setSaving(false);
    if (!saved.ok) {
      toast(saved.error);
      return;
    }
    if (saved.publicId !== qid) setQid(saved.publicId);
    if (promo && !saved.promoApplied) {
      setPromo("");
      setPromoMsg({ kind: "bad", text: "That code is not valid." });
    }
    const plain = saved.text.replace(/\*/g, "");
    if (kind === "copy") {
      try {
        await navigator.clipboard.writeText(plain);
        toast("Quote copied.");
      } catch {
        toast("Could not copy. Use WhatsApp or email instead.");
      }
      return;
    }
    if (kind === "wa") {
      window.open(
        `https://wa.me/${encodeURIComponent(config.brand.wa)}?text=${encodeURIComponent(saved.text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      window.location.href = `mailto:${config.brand.email}?subject=${encodeURIComponent(`Quotation request ${saved.publicId}`)}&body=${encodeURIComponent(plain)}`;
    }
    toast("Quote saved.");
  }

  const copy = config.copy;
  const style = config.video.styles.find((item) => item.id === vid.styleId) || config.video.styles[0];
  const resolution = config.video.resolutions.find((item) => item.key === vid.res);

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <a className="brand" href="#top">
            {/* Logo URL is editable in admin and may point outside this app. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.brand.logoUrl} alt={`${config.brand.name} logo`} width={42} height={42} />
            <span>
              <b>{config.brand.name}</b>
              <small>{config.brand.tag}</small>
            </span>
          </a>
          <nav>
            <a href="#services">{copy.navServices}</a>
            <a href="#pricing">{copy.navPricing}</a>
            <a href="#offers">{copy.navOffers}</a>
            <a href="#contact">{copy.navContact}</a>
          </nav>
          <a className="qpill" href="#quote">
            Your quote <b>{totalLabel}</b>
          </a>
        </div>
      </header>
      <main>
        <section className="hero wrap" id="top">
          <div>
            <h1>{copy.heroTitle}</h1>
            <p className="lead">{copy.heroLead}</p>
            <div className="cta">
              <a className="btn" href="#pricing">
                {copy.ctaPrimary}
              </a>
              <a className="btn ghost" href="#services">
                {copy.ctaSecondary}
              </a>
            </div>
          </div>
          <aside className="tag tilt" aria-label="AI video rates">
            <div className="tag-h">
              <h3>{copy.videoRateTitle}</h3>
            </div>
            {config.video.resolutions.map((item) => (
              <div className="trow" key={item.key}>
                <span>
                  {item.label} {item.detail}
                </span>
                <b>
                  {fmt(item.rate)} <i>/ sec</i>
                </b>
              </div>
            ))}
            <div className="perf" />
            <p className="note">
              Editing is added separately. <strong>{num(config.video.durDisc.pct)}% off</strong> at{" "}
              {config.video.durDisc.minSec} sec or longer, and{" "}
              <strong>{num(config.video.qtyDisc.pct)}% off</strong> above {config.video.qtyDisc.above}{" "}
              videos.
            </p>
          </aside>
        </section>

        <section className="sec wrap" id="services">
          <h2>{copy.servicesHeading}</h2>
          <p className="sub">{copy.servicesSub}</p>
          <div className="grid4">
            {config.video.styles.map((item) => (
              <article className="vcard" key={item.id}>
                <div className="icb">
                  <Icon name={item.icon} size={22} />
                </div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
          <div className="studio">
            <h3>{copy.studioHeading}</h3>
            <div className="pills">
              {config.services.map((item) => (
                <span className="pill" key={item.id}>
                  <Icon name={item.icon} size={16} />
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="sec wrap" id="pricing">
          <h2>{copy.pricingHeading}</h2>
          <p className="sub">{copy.pricingSub}</p>
          <div className="calc">
            <div>
              <div className="tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "video"}
                  onClick={() => setTab("video")}
                >
                  {copy.tabVideo}
                </button>
                <button role="tab" aria-selected={tab === "svc"} onClick={() => setTab("svc")}>
                  {copy.tabServices}
                </button>
              </div>
              {tab === "video" ? (
                <div>
                  <div className="blk">
                    <h3>Video style</h3>
                    <div className="stylepick">
                      {config.video.styles.map((item) => (
                        <button
                          className="sp"
                          key={item.id}
                          type="button"
                          aria-pressed={item.id === vid.styleId}
                          onClick={() => updateVideo({ styleId: item.id })}
                        >
                          <span className="icb">
                            <Icon name={item.icon} size={18} />
                          </span>
                          <span>
                            {item.name}
                            <small>{item.mult && item.mult !== 1 ? `x${item.mult} rate` : "Standard rate"}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="blk">
                    <h3>Length of each video</h3>
                    <div className="len">
                      <div className="numbox">
                        <input
                          type="number"
                          min={config.video.minSec}
                          max={600}
                          aria-label="Seconds per video"
                          value={vid.dur}
                          onChange={(event) =>
                            updateVideo({ dur: parseInt(event.target.value, 10) || config.video.minSec })
                          }
                          onBlur={() => videoCalc && updateVideo({ dur: videoCalc.dur })}
                        />
                        <span>sec</span>
                      </div>
                      <input
                        type="range"
                        min={config.video.minSec}
                        max={config.video.maxSec}
                        step={1}
                        aria-label="Video length slider"
                        value={Math.min(vid.dur, config.video.maxSec)}
                        onChange={(event) => updateVideo({ dur: Number(event.target.value) })}
                      />
                    </div>
                    <div className="quick">
                      {durations.map((value) => (
                        <button
                          className="qk"
                          key={value}
                          type="button"
                          aria-pressed={value === videoCalc?.dur}
                          onClick={() => updateVideo({ dur: value })}
                        >
                          {value} sec
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="blk">
                    <h3>Quality</h3>
                    <div className="resrow">
                      {config.video.resolutions.map((item) => {
                        const rate =
                          (num(item.rate) + (vid.edit ? num(item.editRate) : 0)) * (style?.mult || 1);
                        return (
                          <button
                            className="res"
                            key={item.key}
                            type="button"
                            aria-pressed={vid.res === item.key}
                            onClick={() => updateVideo({ res: item.key })}
                          >
                            <b>{item.label}</b>
                            <small>{item.detail}</small>
                            <em>
                              {fmt(rate)} <i>/ sec</i>
                            </em>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="blk two2">
                    <div>
                      <h3>Editing</h3>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={vid.edit}
                          onChange={(event) => updateVideo({ edit: event.target.checked })}
                        />
                        <span className="sw-t" />
                        <span>
                          <b>Add professional editing</b>
                          <small>
                            +{fmt(num(resolution?.editRate) * (style?.mult || 1))} per second at{" "}
                            {resolution?.label}
                          </small>
                        </span>
                      </label>
                    </div>
                    <div>
                      <h3>Number of videos</h3>
                      <div className="stepper">
                        <button
                          type="button"
                          aria-label="Fewer videos"
                          onClick={() => updateVideo({ qty: Math.max(1, (Math.round(vid.qty) || 1) - 1) })}
                        >
                          <Icon name="minus" size={16} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          aria-label="Number of videos"
                          value={vid.qty}
                          onChange={(event) => updateVideo({ qty: parseInt(event.target.value, 10) || 1 })}
                          onBlur={() => videoCalc && updateVideo({ qty: videoCalc.qty })}
                        />
                        <button
                          type="button"
                          aria-label="More videos"
                          onClick={() => updateVideo({ qty: Math.max(1, (Math.round(vid.qty) || 1) + 1) })}
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {videoCalc ? (
                    <div className="live">
                      <div className="calc-line">
                        <span>One video</span>
                        <b>
                          {videoCalc.dur} sec x {fmt(videoCalc.rate)} = {fmt(videoCalc.per)}
                        </b>
                      </div>
                      <div className="calc-line">
                        <span>Quantity</span>
                        <b>x {videoCalc.qty}</b>
                      </div>
                      {videoCalc.pct ? (
                        <div className="calc-line">
                          <span>Discount ({videoCalc.pct}%)</span>
                          <b>-{fmt(videoCalc.disc)}</b>
                        </div>
                      ) : null}
                      <div className="big">
                        <div>
                          <small>Price for this video order</small>
                          <strong>{fmt(videoCalc.net)}</strong>
                        </div>
                        <button className="btn" type="button" onClick={addVideo}>
                          <Icon name="plus" size={18} />
                          {copy.addToQuote}
                        </button>
                      </div>
                      <div className="nudges">
                        {num(config.video.durDisc.pct) ? (
                          <div className={videoCalc.dur >= config.video.durDisc.minSec ? "nd ok" : "nd"}>
                            <Icon
                              name={videoCalc.dur >= config.video.durDisc.minSec ? "check" : "info"}
                              size={16}
                            />
                            <span>
                              {videoCalc.dur >= config.video.durDisc.minSec
                                ? `${config.video.durDisc.pct}% length discount applied.`
                                : `Make it ${config.video.durDisc.minSec} sec or more to save ${config.video.durDisc.pct}%.`}
                            </span>
                          </div>
                        ) : null}
                        {num(config.video.qtyDisc.pct) ? (
                          <div
                            className={
                              videoCalc.qty > config.video.qtyDisc.above &&
                              videoCalc.dur >= config.video.qtyDisc.minSec
                                ? "nd ok"
                                : "nd"
                            }
                          >
                            <Icon
                              name={
                                videoCalc.qty > config.video.qtyDisc.above &&
                                videoCalc.dur >= config.video.qtyDisc.minSec
                                  ? "check"
                                  : "info"
                              }
                              size={16}
                            />
                            <span>
                              {videoCalc.qty > config.video.qtyDisc.above &&
                              videoCalc.dur >= config.video.qtyDisc.minSec
                                ? `${config.video.qtyDisc.pct}% volume discount applied.`
                                : `Order ${config.video.qtyDisc.above + 1} or more videos (${Math.max(0, config.video.qtyDisc.above + 1 - videoCalc.qty)} to go) to save ${config.video.qtyDisc.pct}%.`}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="note">Add a video style and a resolution in admin to price videos.</p>
                  )}
                </div>
              ) : (
                <div className="svgrid">
                  {config.services.map((service) => {
                    const state = services[service.id] || { qty: 0, mult: service.mult?.def ?? 1 };
                    const priced = svCalc(service, { id: service.id, qty: state.qty, mult: state.mult });
                    const lab = service.tierOn === "units" ? `${service.unit}s` : service.qtyLabel;
                    const tiers = [...service.tiers].sort((a, b) => a.min - b.min);
                    const basis = priced ? priced.basis : 0;
                    const next = tiers.find((tier) => tier.min > basis);
                    let hint = "";
                    let hintOk = false;
                    if (!priced) {
                      hint = tiers.length
                        ? `Order ${tiers[0].min}+ ${lab} to save ${tiers[0].pct}%.`
                        : service.moq > 1
                          ? `Minimum order is ${service.moq} ${service.qtyLabel}.`
                          : "";
                    } else if (priced.pct && !next) {
                      hint = `${priced.pct}% discount applied.`;
                      hintOk = true;
                    } else if (next) {
                      hint = `${priced.pct ? `${priced.pct}% applied. ` : ""}Add ${next.min - basis} more ${lab} to save ${next.pct}%.`;
                      hintOk = Boolean(priced.pct);
                    }
                    return (
                      <article className={priced ? "svc on" : "svc"} key={service.id}>
                        <div className="svc-h">
                          <div className="icb">
                            <Icon name={service.icon} size={20} />
                          </div>
                          <div>
                            <h4>{service.name}</h4>
                            <p>{service.desc}</p>
                          </div>
                        </div>
                        <div className="svc-p">
                          <b>{fmt(service.price)}</b>
                          <span>per {service.unit}</span>
                          {service.moq > 1 ? (
                            <span className="chip">
                              Minimum {service.moq} {service.qtyLabel}
                            </span>
                          ) : null}
                        </div>
                        {service.mult ? (
                          <label className="mult">
                            <span>{service.mult.label}</span>
                            <input
                              type="number"
                              min={service.mult.min}
                              max={service.mult.max}
                              value={state.mult}
                              onChange={(event) => {
                                const value = parseInt(event.target.value, 10) || service.mult!.def;
                                const clamped = Math.max(
                                  service.mult!.min,
                                  Math.min(service.mult!.max, value),
                                );
                                setServices((current) => ({
                                  ...current,
                                  [service.id]: { qty: current[service.id]?.qty || 0, mult: clamped },
                                }));
                              }}
                            />
                          </label>
                        ) : null}
                        <div className="svc-c">
                          <div>
                            <span className="stepper">
                              <button
                                type="button"
                                aria-label="Decrease"
                                onClick={() => stepService(service, -1)}
                              >
                                <Icon name="minus" size={16} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                aria-label={`${service.name} quantity`}
                                value={state.qty}
                                onChange={(event) =>
                                  setServiceQty(service, parseInt(event.target.value, 10) || 0, false)
                                }
                                onBlur={(event) =>
                                  setServiceQty(service, parseInt(event.target.value, 10) || 0, true)
                                }
                              />
                              <button
                                type="button"
                                aria-label="Increase"
                                onClick={() => stepService(service, 1)}
                              >
                                <Icon name="plus" size={16} />
                              </button>
                            </span>
                            <span className="ql">{service.qtyLabel}</span>
                          </div>
                          <div className={priced ? "svc-t" : "svc-t none"}>
                            {priced ? (
                              <>
                                {fmt(priced.net)}
                                {priced.pct ? <span className="chip">{priced.pct}% off</span> : null}
                              </>
                            ) : (
                              "Not added"
                            )}
                          </div>
                        </div>
                        {hint ? <div className={hintOk ? "hint ok" : "hint"}>{hint}</div> : <div className="hint" />}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="tag quote" id="quote" aria-live="polite">
              <div className="tag-h">
                <h3>{copy.quoteTitle}</h3>
                <small>{qid || ""}</small>
              </div>
              <div className="tag-for">{lead ? `Prepared for ${lead.name}` : ""}</div>
              {!hasQuote || !totals ? (
                <p className="empty">{copy.emptyQuote}</p>
              ) : (
                totals.rows.map((row) => (
                  <div className="qline" key={row.rm}>
                    <b>{row.name}</b>
                    <span className="p">
                      {row.pct ? <s>{fmt(row.gross)}</s> : null}
                      {fmt(row.net)}
                      {row.pct ? (
                        <>
                          <br />
                          <em>{row.pct}% off</em>
                        </>
                      ) : null}
                    </span>
                    <span className="m">{row.meta}</span>
                    <button className="rm" type="button" onClick={() => removeRow(row.rm)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
              <div className="promo">
                <input
                  type="text"
                  placeholder="Promo code"
                  autoComplete="off"
                  aria-label="Promo code"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyPromo();
                    }
                  }}
                />
                <button className="btn ghost small" type="button" onClick={applyPromo}>
                  Apply
                </button>
              </div>
              <div className={promoMsg.kind ? `msg ${promoMsg.kind}` : "msg"}>{promoMsg.text}</div>
              <div className="perf" />
              {hasQuote && totals ? (
                <>
                  {totals.saved > 0.5 ? (
                    <div className="tot">
                      <span>Price before discounts</span>
                      <b>{fmt(totals.gross)}</b>
                    </div>
                  ) : null}
                  {totals.itemDisc > 0.5 ? (
                    <div className="tot neg">
                      <span>Length and volume discounts</span>
                      <b>-{fmt(totals.itemDisc)}</b>
                    </div>
                  ) : null}
                  {totals.bundleDisc > 0.5 ? (
                    <div className="tot neg">
                      <span>Bundle bonus ({totals.bp}%)</span>
                      <b>-{fmt(totals.bundleDisc)}</b>
                    </div>
                  ) : null}
                  {totals.promoDisc > 0.5 ? (
                    <div className="tot neg">
                      <span>
                        Promo {promo} ({totals.pp}%)
                      </span>
                      <b>-{fmt(totals.promoDisc)}</b>
                    </div>
                  ) : null}
                  {num(config.gst.rate) ? (
                    <div className="tot">
                      <span>GST ({num(config.gst.rate)}%)</span>
                      <b>{fmt(totals.gst)}</b>
                    </div>
                  ) : null}
                  <div className="grand">
                    <span>Total</span>
                    <strong>{fmt(totals.total)}</strong>
                  </div>
                  {totals.saved > 0.5 ? (
                    <div className="saved">
                      <Icon name="gift" size={16} />
                      You save {fmt(totals.saved)} on this quote
                    </div>
                  ) : null}
                  {num(config.bundle.pct) && totals.nk < config.bundle.min ? (
                    <p className="fine">
                      Add {config.bundle.min - totals.nk} more{" "}
                      {config.bundle.min - totals.nk > 1 ? "services" : "service"} for an extra{" "}
                      {num(config.bundle.pct)}% bundle bonus.
                    </p>
                  ) : null}
                </>
              ) : null}
              <div className="actions">
                <button
                  className={hasQuote && !saving ? "btn block" : "btn block off"}
                  type="button"
                  onClick={() => deliver("wa")}
                >
                  <Icon name="wa" />
                  {copy.sendWhatsApp}
                </button>
                <div className="row2">
                  <button
                    className={hasQuote && !saving ? "btn ghost" : "btn ghost off"}
                    type="button"
                    onClick={() => deliver("mail")}
                  >
                    <Icon name="mail" size={18} />
                    {copy.emailLabel}
                  </button>
                  <button
                    className={hasQuote && !saving ? "btn ghost" : "btn ghost off"}
                    type="button"
                    onClick={() => deliver("copy")}
                  >
                    <Icon name="share" size={18} />
                    {copy.copyQuote}
                  </button>
                </div>
              </div>
              <p className="fine">
                {hasQuote
                  ? `Valid for ${config.validDays} days. Final price is confirmed by ${config.brand.name}.`
                  : ""}
              </p>
            </aside>
          </div>
        </section>

        <section className="sec wrap" id="offers">
          <h2>{copy.offersHeading}</h2>
          <p className="sub">{copy.offersSub}</p>
          <div className="ogrid">
            {offers.map((offer) => (
              <div className="ocard" key={offer.title}>
                <div className="icb">
                  <Icon name={offer.icon} size={22} />
                </div>
                <div>
                  <b>{offer.title}</b>
                  <p>{offer.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sec wrap" id="contact">
          <div className="cbox">
            <div>
              <h2>{copy.contactHeading}</h2>
              <p className="sub">{copy.contactSub}</p>
            </div>
            <div className="clinks">
              <a className="cl" href={`https://wa.me/${encodeURIComponent(config.brand.wa)}`} target="_blank" rel="noopener noreferrer">
                <Icon name="wa" size={22} />
                <div>
                  <span>WhatsApp</span>
                  <b>{displayPhone(config.brand.phone)}</b>
                </div>
              </a>
              <a className="cl" href={phoneHref(config.brand.phone)}>
                <Icon name="phone" size={22} />
                <div>
                  <span>Call</span>
                  <b>{displayPhone(config.brand.phone)}</b>
                </div>
              </a>
              <a className="cl" href={`mailto:${config.brand.email}`}>
                <Icon name="mail" size={22} />
                <div>
                  <span>Email</span>
                  <b>{config.brand.email}</b>
                </div>
              </a>
              <a className="cl" href={config.brand.insta} target="_blank" rel="noopener noreferrer">
                <Icon name="insta" size={22} />
                <div>
                  <span>Instagram</span>
                  <b>{instagramHandle(config.brand.insta)}</b>
                </div>
              </a>
              {config.brand.website ? (
                <a className="cl" href={config.brand.website} target="_blank" rel="noopener noreferrer">
                  <Icon name="globe" size={22} />
                  <div>
                    <span>Website</span>
                    <b>{config.brand.website.replace(/^https?:\/\//, "")}</b>
                  </div>
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap">
          {config.brand.name}, {config.brand.tag}. {copy.footerNote}
        </div>
      </footer>
      <div className={hasQuote ? "mbar show" : "mbar"}>
        <div>
          <small>Your quote</small>
          <strong>{totalLabel}</strong>
        </div>
        <a className="btn small" href="#quote">
          View quote
        </a>
      </div>

      {gate ? (
        <div className="ov">
          <form
            className="tag gate"
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            onSubmit={(event) => {
              event.preventDefault();
              void submitGate(new FormData(event.currentTarget));
            }}
          >
            <h2 id="gate-title">{copy.gateTitle}</h2>
            <p className="sub">{copy.gateBody}</p>
            <label className="fld">
              <span>
                Your name <i>*</i>
              </span>
              <input name="name" type="text" autoComplete="name" />
              <small>{errors.name || ""}</small>
            </label>
            <label className="fld">
              <span>
                Mobile number <i>*</i>
              </span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" />
              <small>{errors.phone || ""}</small>
            </label>
            <label className="fld">
              <span>
                Email <i>*</i>
              </span>
              <input name="email" type="email" autoComplete="email" />
              <small>{errors.email || ""}</small>
            </label>
            <div className="f2">
              <label className="fld">
                <span>Company (optional)</span>
                <input name="company" type="text" autoComplete="organization" />
              </label>
              <label className="fld">
                <span>GST number (optional)</span>
                <input name="gst" type="text" maxLength={15} />
                <small>{errors.gst || ""}</small>
              </label>
            </div>
            <button className="btn block" type="submit">
              {copy.gateSubmit}
            </button>
          </form>
        </div>
      ) : null}
      <div className={toastOn ? "toast show" : "toast"} role="status">
        {toastText}
      </div>
    </>
  );
}
