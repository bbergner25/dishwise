import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Reduction - The Recipe Synthesizer",
  description: "The best recipes on the internet. Reduced for you.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reduction - The Recipe Synthesizer",
  },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="apple-touch-icon" href="/icon-192.png"/></head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
