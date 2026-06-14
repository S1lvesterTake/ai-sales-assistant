export interface BusinessProfileInput {
  businessName: string;
  slug?: string;
  description?: string;
  category?: string;
  whatsappNumber: string;
  location?: string;
  operatingHours?: string;
  mainOffer?: string;
  ctaMessage?: string;
}

export interface BusinessProfile extends BusinessProfileInput {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBusiness {
  slug: string;
  businessName: string;
  description: string | null;
  category: string | null;
  location: string | null;
  operatingHours: string | null;
  mainOffer: string | null;
  ctaMessage: string | null;
  suggestedQuestions: string[];
}
