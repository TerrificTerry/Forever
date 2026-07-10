export type RawNewsItem = {
  title: string;
  source: string | null;
  url: string;
  publishedAt: Date | null;
  snippet: string | null;
};

const GOOGLE_NEWS_SEARCH = "https://news.google.com/rss/search";

function decodeXml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
  };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === "#") {
        const isHex = entity[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return named[entity.toLowerCase()] ?? match;
    })
    .replace(/\u00a0/g, " ");
}

function textBetween(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function attrValue(xml: string, tag: string, attr: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function stripHtml(value: string) {
  return decodeXml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(value: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date : null;
}

function readableTitle(title: string, source: string | null) {
  if (!source) return title;
  return title.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim() || title;
}

function normalizeLink(value: string) {
  try {
    const url = new URL(value);
    const nested = url.searchParams.get("url") || url.searchParams.get("u");
    if (nested?.startsWith("http")) return nested;
    return url.toString();
  } catch {
    return value;
  }
}

export async function fetchNewsForTopic(query: string) {
  const url = new URL(GOOGLE_NEWS_SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "SpiritArchive/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`News source returned HTTP ${response.status}.`);
  const xml = await response.text();
  const itemXml = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => match[1]);
  const seen = new Set<string>();
  return itemXml
    .map((item): RawNewsItem | null => {
      const source = textBetween(item, "source") || null;
      const sourceUrl = attrValue(item, "source", "url");
      const link = normalizeLink(textBetween(item, "link") || sourceUrl);
      const title = readableTitle(textBetween(item, "title"), source);
      if (!title || !link || seen.has(link)) return null;
      seen.add(link);
      return {
        title,
        source,
        url: link,
        publishedAt: safeDate(textBetween(item, "pubDate")),
        snippet: stripHtml(textBetween(item, "description")) || null,
      };
    })
    .filter((item): item is RawNewsItem => !!item)
    .slice(0, 8);
}
