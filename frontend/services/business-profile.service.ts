import { publicApiClient, type ApiClient } from "@/services/api-client";
import type {
  BusinessProfile,
  BusinessProfileInput,
  PublicBusiness,
} from "@/types/business";

export const businessProfileService = {
  getPublic(businessSlug: string, client: ApiClient = publicApiClient) {
    return client.request<PublicBusiness>(
      `/api/public/businesses/${encodeURIComponent(businessSlug)}`,
    );
  },
  getPrivate(client: ApiClient) {
    return client.request<BusinessProfile>("/api/business-profile");
  },
  create(client: ApiClient, input: BusinessProfileInput) {
    return client.request<BusinessProfile>("/api/business-profile", {
      method: "POST",
      body: input,
    });
  },
  update(client: ApiClient, input: Partial<BusinessProfileInput>) {
    return client.request<BusinessProfile>("/api/business-profile", {
      method: "PATCH",
      body: input,
    });
  },
};
