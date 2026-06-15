import type { Metadata } from "next";

import { ChatExperience } from "@/components/chat/chat-experience";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Demo Chatbot Kopi Senja",
  description: "Coba pengalaman AI Sales Assistant untuk bisnis demo Kopi Senja.",
};

export default function DemoChatPage() {
  const environment = getPublicEnv();
  return (
    <ChatExperience
      businessSlug={environment.NEXT_PUBLIC_DEMO_BUSINESS_SLUG}
    />
  );
}
