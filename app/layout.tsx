import type { Metadata } from "next";
import { Press_Start_2P, Courier_Prime } from "next/font/google";
import { Providers } from "@/contexts/providers";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

// Fuentes del prototipo (references/resource/project/styles.css):
// "Press Start 2P" para titulares/HUD, "Courier Prime" para el cuerpo.
// next/font las auto-hospeda; se exponen como variables CSS y las consume
// globals.css vía --font-press-start / --font-courier-prime.
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description:
    "Plataforma para jugar online y competir por la mayor puntuación.",
};

// Script anti-flash (spec 09): fija data-theme en <html> antes de hidratar,
// leyendo la elección guardada o, en su ausencia, prefers-color-scheme del
// sistema. Ver node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
const THEME_INIT_SCRIPT = `(function(){try{var k="arcadevault.theme.v1";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${pressStart.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
