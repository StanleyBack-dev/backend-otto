// News feeds the owner follows and the headlines collected from them. The
// sources are the owner's choice (none is fixed in the code); the
// suggestions below only help to start.
export type NewsSource = {
  id: string;
  userId: string;
  name: string;
  url: string;
  /** Free label used to filter: "geral", "tecnologia", "Goiânia"… */
  category: string;
  active: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
};

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  category: string;
  title: string;
  link: string;
  summary: string | null;
  publishedAt: Date;
};

export type FeedEntry = {
  title: string;
  link: string;
  summary: string | null;
  publishedAt: Date | null;
};

export const NEWS_RETENTION_DAYS = 14;
/** A source read longer ago than this is refreshed before answering. */
export const STALE_AFTER_MS = 6 * 60 * 60_000;
export const SOURCE_NAME_MAX = 60;
export const CATEGORY_MAX = 40;
export const SUMMARY_MAX = 500;

export const SUGGESTED_SOURCES: readonly {
  name: string;
  url: string;
  category: string;
}[] = [
  { name: "g1", url: "https://g1.globo.com/rss/g1/", category: "geral" },
  {
    name: "g1 Tecnologia",
    url: "https://g1.globo.com/rss/g1/tecnologia/",
    category: "tecnologia",
  },
  {
    name: "Tecmundo",
    url: "https://rss.tecmundo.com.br/feed",
    category: "tecnologia",
  },
  {
    name: "g1 Economia",
    url: "https://g1.globo.com/rss/g1/economia/",
    category: "economia",
  },
];

export function normalizeCategory(category: string): string {
  return category
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, CATEGORY_MAX)
    .toLowerCase();
}

/**
 * Only public http(s) feeds: the API fetches the URL, so local and private
 * network addresses are refused.
 */
export function isAllowedFeedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!host.includes(".") && !host.includes(":"))
  ) {
    return false;
  }
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return false;
    }
  }
  if (host.includes(":")) {
    // IPv6 literal: refuse loopback, link-local and unique-local ranges.
    if (host === "::1" || /^(fe80|fc|fd)/.test(host) || host === "::") {
      return false;
    }
  }
  return true;
}

/** Plain text from a feed field that may carry HTML. */
export function plainText(value: string, max: number): string {
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
