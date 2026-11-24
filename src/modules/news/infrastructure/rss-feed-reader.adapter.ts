import { Injectable } from "@nestjs/common";
import { XMLParser } from "fast-xml-parser";
import {
  FeedReaderError,
  type FeedReaderPort,
} from "@/modules/news/application/ports/feed-reader.port";
import {
  plainText,
  SUMMARY_MAX,
  type FeedEntry,
} from "@/modules/news/domain/news";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ENTRIES = 60;

type Node = Record<string, unknown>;

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Text of a node that may be a string or { "#text": … } (attributes, CDATA). */
function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as Node)["#text"]);
  }
  return "";
}

function date(value: unknown): Date | null {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Atom links: the rel="alternate" one (or the first). */
function atomLink(value: unknown): string {
  const links = asArray(value as Node | Node[]);
  const alternate =
    links.find((link) => !link["@_rel"] || link["@_rel"] === "alternate") ??
    links[0];
  return alternate ? String(alternate["@_href"] ?? text(alternate)) : "";
}

// RSS 2.0, RSS 1.0 (RDF) and Atom feeds over HTTP(S).
@Injectable()
export class RssFeedReaderAdapter implements FeedReaderPort {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    processEntities: true,
    htmlEntities: true,
  });

  async read(
    url: string,
  ): Promise<{ title: string | null; entries: FeedEntry[] }> {
    const xml = await this.download(url);
    let doc: Node;
    try {
      doc = this.parser.parse(xml) as Node;
    } catch {
      throw new FeedReaderError("Not valid XML.");
    }
    const rss = doc.rss as Node | undefined;
    const rdf = doc.RDF as Node | undefined;
    const atom = doc.feed as Node | undefined;

    if (rss?.channel || rdf) {
      const channel = (rss?.channel ?? rdf?.channel ?? {}) as Node;
      const items = asArray(
        (channel.item ?? rdf?.item) as Node | Node[] | undefined,
      );
      return {
        title: plainText(text(channel.title), 60) || null,
        entries: this.entries(
          items.map((item) => ({
            title: text(item.title),
            link: text(item.link) || text(item.guid),
            summary: text(item.description) || text(item.encoded),
            date: item.pubDate ?? item.date ?? item.updated,
          })),
        ),
      };
    }
    if (atom) {
      return {
        title: plainText(text(atom.title), 60) || null,
        entries: this.entries(
          asArray(atom.entry as Node | Node[] | undefined).map((entry) => ({
            title: text(entry.title),
            link: atomLink(entry.link),
            summary: text(entry.summary) || text(entry.content),
            date: entry.published ?? entry.updated,
          })),
        ),
      };
    }
    throw new FeedReaderError("Not an RSS or Atom feed.");
  }

  private entries(
    raw: { title: string; link: string; summary: string; date: unknown }[],
  ): FeedEntry[] {
    return raw
      .map((entry) => ({
        title: plainText(entry.title, 300),
        link: entry.link.trim().slice(0, 1000),
        summary: plainText(entry.summary, SUMMARY_MAX) || null,
        publishedAt: date(entry.date),
      }))
      .filter((entry) => entry.title && /^https?:\/\//.test(entry.link))
      .slice(0, MAX_ENTRIES);
  }

  private async download(url: string): Promise<string> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept:
            "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
          "user-agent": "OttoFeedReader/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new FeedReaderError(
        `Unreachable: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
    if (!response.ok) throw new FeedReaderError(`HTTP ${response.status}.`);
    const body = await response.text();
    if (body.length > MAX_BYTES) throw new FeedReaderError("Feed too large.");
    return body;
  }
}
