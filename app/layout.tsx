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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
