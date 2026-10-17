import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneMaptech Dashboard",
  description: "Sales performance dashboard — Digiplus",
  icons: {
    icon: [{ url: "/icon.png" }, { url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  openGraph: {
    title: "OneMaptech Dashboard",
    description: "Sales performance dashboard — Digiplus",
    images: [{ url: "/logo/logo-512.png", width: 512, height: 339 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneMaptech Dashboard",
    description: "Sales performance dashboard — Digiplus",
    images: ["/logo/logo-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5fa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>{children}</body>
    </html>
  );
}
