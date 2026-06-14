import type { Metadata } from "next";

import { ChatExperience } from "@/components/chat/chat-experience";

export const metadata: Metadata = {
  title: "Chat dengan Asisten Bisnis",
  description: "Tanyakan produk, harga, dan cara pemesanan melalui asisten bisnis.",
  robots: { index: false, follow: false },
};

export default async function PublicChatPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  return <ChatExperience businessSlug={businessSlug} />;
}
