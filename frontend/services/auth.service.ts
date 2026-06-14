import type { ApiClient } from "@/services/api-client";
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from "@/types/auth";

export const authService = {
  login(client: ApiClient, input: LoginInput) {
    return client.request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: input,
    });
  },
  register(client: ApiClient, input: RegisterInput) {
    return client.request<AuthSession>("/api/auth/register", {
      method: "POST",
      body: input,
    });
  },
  getCurrentUser(client: ApiClient) {
    return client.request<AuthUser>("/api/auth/me");
  },
};
