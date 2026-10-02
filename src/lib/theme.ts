import { defaultTheme } from "./defaults";
import type { Palette, ThemeMode, ThemeSettings } from "./types";

const HEX = /^#[0-9a-fA-F]{3,8}$/;

function hex(value: unknown, fallback: string) {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

function palette(value: unknown, fallback: Palette): Palette {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    bg: hex(source.bg, fallback.bg),
    panel: hex(source.panel, fallback.panel),
    panel2: hex(source.panel2, fallback.panel2),
    line: hex(source.line, fallback.line),
    text: hex(source.text, fallback.text),
    muted: hex(source.muted, fallback.muted),
    acc: hex(source.acc, fallback.acc),
    accInk: hex(source.accInk, fallback.accInk),
    accText: hex(source.accText, fallback.accText),
    warn: hex(source.warn, fallback.warn),
    danger: hex(source.danger, fallback.danger),
  };
}

function fontName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/[^a-zA-Z0-9 ,'-]/g, "").trim().slice(0, 80);
  return clean || fallback;
}

export function parseTheme(value: unknown): ThemeSettings {
  const fallback = defaultTheme();
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const mode: ThemeMode =
    source.mode === "dark" || source.mode === "light" || source.mode === "system"
      ? source.mode
      : fallback.mode;
  return {
    mode,
    fontHead: fontName(source.fontHead, fallback.fontHead),
    fontBody: fontName(source.fontBody, fallback.fontBody),
    dark: palette(source.dark, fallback.dark),
    light: palette(source.light, fallback.light),
  };
}

function block(paletteValue: Palette, shadow: string) {
  return `--bg:${paletteValue.bg};--panel:${paletteValue.panel};--panel2:${paletteValue.panel2};--line:${paletteValue.line};--text:${paletteValue.text};--muted:${paletteValue.muted};--acc:${paletteValue.acc};--acc-ink:${paletteValue.accInk};--acc-text:${paletteValue.accText};--warn:${paletteValue.warn};--danger:${paletteValue.danger};--shadow:${shadow};--tint:color-mix(in srgb, ${paletteValue.acc} 14%, transparent);`;
}

function fontStack(name: string, loaded: "bricolage" | "dm") {
  if (loaded === "bricolage" && /bricolage/i.test(name)) {
    return `var(--font-bricolage), "${name}", "Segoe UI", system-ui, sans-serif`;
  }
  if (loaded === "dm" && /dm sans/i.test(name)) {
    return `var(--font-dm), "${name}", "Segoe UI", system-ui, sans-serif`;
  }
  return `"${name}", "Segoe UI", system-ui, sans-serif`;
}

export function themeToCss(theme: ThemeSettings) {
  const fonts = `--hf:${fontStack(theme.fontHead, "bricolage")};--bf:${fontStack(theme.fontBody, "dm")};`;
  return `:root{${block(theme.dark, "0 24px 60px rgba(0,0,0,.55)")}${fonts}}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){${block(theme.light, "0 24px 60px rgba(30,60,30,.14)")}}}
:root[data-theme="light"]{${block(theme.light, "0 24px 60px rgba(30,60,30,.14)")}}
:root[data-theme="dark"]{${block(theme.dark, "0 24px 60px rgba(0,0,0,.55)")}}`;
}
