import type { Metadata, Viewport } from "next";
import { Jost, Playfair_Display } from "next/font/google";
import "./burnout.css";

// Burnout's guest menu (components/burnout) is what a table's QR code opens.

// Playfair echoes the gold serif on the printed sheesha menus
const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Jost is the closest free match to the wide geometric BURNOUT wordmark
const body = Jost({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Burnout",
  description:
    "Scan. Browse. Order from your table. Food, combos, chakhana and hookah at Burnout.",
  // the POS's own install prompt is for staff, not guests
  manifest: null,
  icons: { icon: "/burnout/icon.svg", apple: "/burnout/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // no maximumScale: guests must be able to pinch-zoom a menu
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0706" },
    { media: "(prefers-color-scheme: light)", color: "#fff7f0" },
  ],
};

/**
 * Day or night, by the clock in IST (the server runs in UTC; IST has no
 * daylight saving, so a fixed +5:30 is exact). It goes on the page's own
 * wrapper — the POS owns <html> — and ThemeToggle re-applies the guest's own
 * choice once the page is running.
 */
function themeForNow(now = new Date()): "day" | "night" {
  const mins = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  return mins >= 690 && mins < 1080 ? "day" : "night"; // 11:30 – 18:00 IST
}

export default function BurnoutGuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`burnout ${display.variable} ${body.variable} w-full flex-1`}
      data-theme={themeForNow()}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
