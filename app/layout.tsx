import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const SITE_URL = "https://the-trip-handler.vercel.app";
const DESCRIPTION =
  "Plan group trips end to end — private invites, applicant approval, lodging, a meal poll, an itinerary, shared expenses, and Stripe-collected per-person payments. For the friend who accidentally became the adult in charge of making the plan.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Trip Handler",
    template: "%s · The Trip Handler",
  },
  description: DESCRIPTION,
  applicationName: "The Trip Handler",
  keywords: [
    "group trip planner",
    "travel organizer",
    "split expenses",
    "trip itinerary",
    "Next.js",
    "Stripe",
  ],
  openGraph: {
    type: "website",
    siteName: "The Trip Handler",
    title: "The Trip Handler",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "The Trip Handler",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased bg-stone-50 text-stone-900 min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
