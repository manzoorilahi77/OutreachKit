import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppChrome } from "@/components/shell/AppChrome";

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

export const viewport: Viewport = { themeColor: "#F7F5F2" };

const themeInit = `try{var t=localStorage.getItem('ok-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
