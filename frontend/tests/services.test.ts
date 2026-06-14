import { createPublicApiClient } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { chatService } from "@/services/chat.service";

const client = createPublicApiClient({ baseUrl: "http://localhost:3001" });

describe("mock-backed services", () => {
  it("returns the deterministic demo login contract", async () => {
    const response = await authService.login(client, {
      email: "demo@kopisenja.id",
      password: "DemoKopiSenja2026!",
    });

    expect(response.data.user.isDemo).toBe(true);
    expect(response.data.accessToken).toBe("demo-token");
  });

  it("returns a completed chat reply using the caller clientMessageId", async () => {
    const response = await chatService.sendMessage(
      "kopi-senja-umkm",
      "019b9d80-7a2e-7b4b-8dc1-7a44b6300040",
      "mock-chat-session-token",
      {
        clientMessageId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300999",
        message: "Berapa harga kopi susu?",
      },
      client,
    );

    expect(response.data).toMatchObject({
      clientMessageId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300999",
      processingStatus: "completed",
      shouldShowWhatsappCta: true,
    });
  });
});
