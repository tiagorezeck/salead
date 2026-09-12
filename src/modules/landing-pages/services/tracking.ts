// src/modules/landing-pages/services/tracking.ts

export interface Channel {
  id: string;
  label: string;
  utm_source: string;
  utm_medium: string;
  color: string;
  group: "social" | "ads" | "chat" | "own" | "search" | "direct";
}

export const DEFAULT_CHANNELS: Channel[] = [
  { id: "instagram",       label: "Instagram",           utm_source: "instagram", utm_medium: "social",       color: "#E1306C", group: "social" },
  { id: "instagram-bio",   label: "Instagram · Bio",     utm_source: "instagram", utm_medium: "bio",          color: "#E1306C", group: "social" },
  { id: "instagram-story", label: "Instagram · Stories", utm_source: "instagram", utm_medium: "story",        color: "#E1306C", group: "social" },
  { id: "facebook",        label: "Facebook",            utm_source: "facebook",  utm_medium: "social",       color: "#1877F2", group: "social" },
  { id: "whatsapp",        label: "WhatsApp",            utm_source: "whatsapp",  utm_medium: "chat",         color: "#25D366", group: "chat"   },
  { id: "whatsapp-list",   label: "WhatsApp · Lista",    utm_source: "whatsapp",  utm_medium: "broadcast",    color: "#25D366", group: "chat"   },
  { id: "tiktok",          label: "TikTok",              utm_source: "tiktok",    utm_medium: "social",       color: "#000000", group: "social" },
  { id: "youtube",         label: "YouTube",             utm_source: "youtube",   utm_medium: "video",        color: "#FF0000", group: "social" },
  { id: "telegram",        label: "Telegram",            utm_source: "telegram",  utm_medium: "chat",         color: "#2AABEE", group: "chat"   },
  { id: "x-twitter",       label: "X / Twitter",         utm_source: "x",         utm_medium: "social",       color: "#111111", group: "social" },
  { id: "linkedin",        label: "LinkedIn",            utm_source: "linkedin",  utm_medium: "social",       color: "#0A66C2", group: "social" },
  { id: "google-ads",      label: "Google Ads",          utm_source: "google",    utm_medium: "cpc",          color: "#4285F4", group: "ads"    },
  { id: "meta-ads",        label: "Meta Ads",            utm_source: "meta",      utm_medium: "paid-social",  color: "#0668E1", group: "ads"    },
  { id: "email",           label: "E-mail",              utm_source: "email",     utm_medium: "email",        color: "#7C3AED", group: "own"    },
  { id: "sms",             label: "SMS",                 utm_source: "sms",       utm_medium: "sms",          color: "#0EA5E9", group: "own"    },
  { id: "direct",          label: "Direto / Orgânico",   utm_source: "direct",    utm_medium: "none",         color: "#9AA0AA", group: "direct" },
];

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "src",
  "ref",
  "campaign",
] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export interface BuildTrackingUrlInput {
  origin?: string;
  slug: string;
  channel: Channel;
  campaign?: string;
  content?: string;
  term?: string;
  extra?: Record<string, string>;
}

export function buildTrackingUrl(input: BuildTrackingUrlInput): string {
  const origin =
    input.origin ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const url = new URL(`/lp/${input.slug}`, origin);
  url.searchParams.set("utm_source", input.channel.utm_source);
  url.searchParams.set("utm_medium", input.channel.utm_medium);
  if (input.campaign) url.searchParams.set("utm_campaign", input.campaign);
  if (input.content) url.searchParams.set("utm_content", input.content);
  if (input.term) url.searchParams.set("utm_term", input.term);
  url.searchParams.set("src", input.channel.id);
  if (input.extra) {
    for (const [k, v] of Object.entries(input.extra)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export interface ParsedUtm {
  source: string;
  utm: Partial<Record<UtmKey, string>>;
  channel?: Channel;
}

export function parseUtm(search: string, channels: Channel[] = DEFAULT_CHANNELS): ParsedUtm {
  const p = new URLSearchParams(search);
  const utm: Partial<Record<UtmKey, string>> = {};
  UTM_KEYS.forEach((k) => {
    const v = p.get(k);
    if (v) utm[k] = v;
  });
  const srcId = p.get("src");
  const source = srcId || p.get("utm_source") || p.get("ref") || "direct";
  const channel =
    channels.find((c) => c.id === source) ??
    channels.find((c) => c.utm_source === source);
  return { source, utm, channel };
}
