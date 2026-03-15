import type { Metadata } from "next";
import { Bodoni_Moda, Figtree, DM_Mono } from "next/font/google";
import { SuppressMediaPipeNoise } from "@/components/SuppressMediaPipeNoise";
import "./globals.css";
import "katex/dist/katex.min.css";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["italic"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASL MathViz",
  description:
    "Real-time ASL phonological decomposition — sign language made mathematically visible.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bodoniModa.variable} ${figtree.variable} ${dmMono.variable}`}
      >
        <SuppressMediaPipeNoise />
        {children}
      </body>
    </html>
  );
}
