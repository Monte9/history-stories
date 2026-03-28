import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "History Stories",
  description:
    "AI-generated historical stories with cinematic cover art. Rome, Ramayana, Mahabharata.",
  openGraph: {
    title: "History Stories",
    description:
      "AI-generated historical stories with cinematic cover art. Rome, Ramayana, Mahabharata.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
