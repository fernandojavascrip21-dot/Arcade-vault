import type { Metadata } from "next";
import { Press_Start_2P, Courier_Prime } from "next/font/google";
import "./globals.css";

// Fuentes del prototipo (references/resource/project/styles.css):
// "Press Start 2P" para titulares/HUD, "Courier Prime" para el cuerpo.
// next/font las auto-hospeda; se exponen como variables CSS y las consume
// globals.css vía --font-pixel / --font-body.
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-courier-prime",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description:
    "Juega clásicos arcade online y compite por la puntuación más alta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
