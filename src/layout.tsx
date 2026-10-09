import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeBliss — Safe AI Companions for Friendship, Growth & Fun",
  description:
    "SafeBliss is the safe, 100% SFW alternative to AI companion apps. Chat with kind AI friends, mentors and coaches — with strict safety guardrails, privacy controls, and zero explicit content.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#07070f] text-white antialiased">{children}</body>
    </html>
  );
}
