import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { loadPublicConfig, loadThemeSettings } from "@/lib/config";
import { defaultTheme } from "@/lib/defaults";
import { themeToCss } from "@/lib/theme";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "700"],
});

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["400", "500", "700"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await loadPublicConfig();
    if (config) {
      return {
        title: `${config.brand.name} | Build your quotation`,
        description: config.copy.heroLead,
      };
    }
  } catch {
    /* database may be offline during setup */
  }
  return { title: "Build your quotation" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let theme = defaultTheme();
  try {
    theme = (await loadThemeSettings()) ?? defaultTheme();
  } catch {
    theme = defaultTheme();
  }
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={theme.mode === "system" ? undefined : theme.mode}
      className={`${bricolage.variable} ${dm.variable}`}
    >
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
        {children}
      </body>
    </html>
  );
}
