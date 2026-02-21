import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flowzo - Smart Bill Management",
  description:
    "Never miss a bill payment again. Flowzo shifts your bills to match your cash flow, powered by peer-to-peer lending.",
  openGraph: {
    title: "Flowzo",
    description: "Smart bill management powered by P2P lending",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1b1b3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: "9999px",
                fontFamily: "var(--font-sans)",
                textAlign: "center" as const,
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
