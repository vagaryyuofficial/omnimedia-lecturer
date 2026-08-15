import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);

  return {
    metadataBase: origin,
    title: "深度语言专家 · Deep Language Expert",
    description:
      "面向中文与英文母语者，以中英双语理解概念，并学习法语、德语、意大利语、西班牙语、韩语与日语。 For Chinese- and English-speaking learners studying French, German, Italian, Spanish, Korean and Japanese.",
    openGraph: {
      title: "深度语言专家 · Deep Language Expert",
      description: "中英双语界面，以母语理解为基础学习六种目标语言。 Bilingual concept learning across six target languages.",
      images: [new URL("/og.png", origin).toString()],
    },
    twitter: {
      card: "summary_large_image",
      title: "深度语言专家 · Deep Language Expert",
      description:
        "A bilingual Chinese-English voice lexicon for learning French, German, Italian, Spanish, Korean and Japanese through knowledge.",
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
