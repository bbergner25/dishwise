import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Every Chef - The Recipe Synthesizer",
  description: "The best recipes on the internet, synthesized into one. No ads, no scroll, no life story.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Every Chef",
  },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#FDFAF5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9,700;1,9,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
