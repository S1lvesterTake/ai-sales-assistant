export interface WhatsappLink {
  url: string;
}

export interface TrackWhatsappClickInput {
  sessionId?: string;
  leadId?: string;
}

export interface WhatsappClickEvent {
  id: string;
  clickedAt: string;
}
