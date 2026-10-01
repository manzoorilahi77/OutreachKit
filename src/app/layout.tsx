import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/ui/SiteHeader";

const jost = localFont({
  src: [
    { path: "../fonts/Jost-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Jost-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-jost",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Famysys Outreach Kit", template: "%s · Famysys Outreach Kit" },
  description: "A field kit for selling websites and software to local service businesses.",
  icons: {
    icon: [
      { url: "/brand/app-icons/famysys-icon-primary-bg-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/app-icons/famysys-icon-primary-bg-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/app-icons/famysys-icon-primary-bg-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2A4A" },
  ],
};

const themeInit = `try{var t=localStorage.getItem('ok-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-fill focus:text-on-fill focus:px-4 focus:py-2">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
