"use client";

export interface SmartLink {
  id: string;
  landingPageId: string;
  source: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
  url: string;
  createdAt: string;
}

export const SMART_LINK_SOURCES = [
  "Instagram",
  "Facebook",
  "Google Ads",
  "Google Orgânico",
  "LinkedIn",
  "WhatsApp",
  "Email",
  "Referral",
  "Evento",
  "Ligação",
  "Direto",
  "Outro"
];

export function generateSmartUrl(baseUrl: string, params: Partial<Omit<SmartLink, 'id' | 'url' | 'createdAt' | 'landingPageId'>>): string {
  const url = new URL(baseUrl);
  
  if (params.source) {
    url.searchParams.set("src", params.source.toLowerCase().replace(/\s+/g, "_"));
    url.searchParams.set("utm_source", params.source);
  }
  
  if (params.campaign) {
    url.searchParams.set("cmp", params.campaign);
    url.searchParams.set("utm_campaign", params.campaign);
  }
  
  if (params.medium) {
    url.searchParams.set("mid", params.medium);
    url.searchParams.set("utm_medium", params.medium);
  }
  
  if (params.content) url.searchParams.set("utm_content", params.content);
  if (params.term) url.searchParams.set("utm_term", params.term);
  
  return url.toString();
}