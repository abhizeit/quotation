export function num(v: unknown) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function fmt(n: number) {
  return "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

export function newQid() {
  return "MF-" + Date.now().toString(36).toUpperCase().slice(-6);
}

export function instagramHandle(url: string) {
  const cleaned = String(url).replace(/\/+$/, "");
  const part = cleaned.split("/").pop() || cleaned;
  return part.startsWith("@") ? part : `@${part}`;
}

export function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:+91${digits}`;
}

export function whatsappHref(phone: string) {
  const raw = phone.replace(/[^\d]/g, "").replace(/^(\d{10})$/, "91$1");
  return `https://wa.me/${raw}`;
}
