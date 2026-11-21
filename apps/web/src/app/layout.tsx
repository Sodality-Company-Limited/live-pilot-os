import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live OS · Demo",
  description: "Live OS Host shell preview",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
