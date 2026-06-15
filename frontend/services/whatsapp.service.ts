import {
  publicApiClient,
  toSearchParams,
  type ApiClient,
} from "@/services/api-client";
import type {
  TrackWhatsappClickInput,
  WhatsappClickEvent,
  WhatsappLink,
} from "@/types/whatsapp";

export const whatsappService = {
  getLink(
    businessSlug: string,
    context: TrackWhatsappClickInput = {},
    sessionToken?: string,
    client: ApiClient = publicApiClient,
  ) {
    return client.request<WhatsappLink>(
      `/api/public/businesses/${encodeURIComponent(businessSlug)}/whatsapp/link${toSearchParams(context)}`,
      { ...(sessionToken ? { sessionToken } : {}) },
    );
  },
  trackClick(
    businessSlug: string,
    context: TrackWhatsappClickInput = {},
    sessionToken?: string,
    client: ApiClient = publicApiClient,
  ) {
    return client.request<WhatsappClickEvent>(
      `/api/public/businesses/${encodeURIComponent(businessSlug)}/whatsapp-clicks`,
      {
        method: "POST",
        body: context,
        ...(sessionToken ? { sessionToken } : {}),
      },
    );
  },
};
