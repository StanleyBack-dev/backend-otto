import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { AppException } from "@/common/exceptions/app-exception";
import type { ToolContext } from "@/modules/assistant/domain/assistant-tool";
import {
  FeedReaderError,
  type FeedReaderPort,
} from "@/modules/news/application/ports/feed-reader.port";
import type {
  NewsFilter,
  NewsRepositoryPort,
} from "@/modules/news/application/ports/news-repository.port";
import { NewsTool } from "@/modules/news/application/tools/news.tool";
import { CollectNewsUseCase } from "@/modules/news/application/use-cases/collect-news.use-case";
import { GetNewsUseCase } from "@/modules/news/application/use-cases/get-news.use-case";
import { ManageNewsSourcesUseCase } from "@/modules/news/application/use-cases/manage-news-sources.use-case";
import {
  isAllowedFeedUrl,
  plainText,
  type FeedEntry,
  type NewsItem,
  type NewsSource,
} from "@/modules/news/domain/news";
import { RssFeedReaderAdapter } from "@/modules/news/infrastructure/rss-feed-reader.adapter";
import { paginate } from "@/shared/application/pagination";

// 2026-11-23 15:00 in Brasília.
const NOW = new Date("2026-11-23T18:00:00Z");
const TZ = "America/Sao_Paulo";
const user: AuthenticatedUser = {
  id: "u1",
  deviceId: "d1",
  name: "Stanley",
  email: "owner@example.com",
};

class InMemoryNews implements NewsRepositoryPort {
  sources: NewsSource[] = [];
  items: (NewsItem & { collected: Date })[] = [];
  filters: NewsFilter[] = [];
  listSources = (userId: string) =>
    Promise.resolve(this.sources.filter((s) => s.userId === userId));
  findSource = (id: string) =>
    Promise.resolve(this.sources.find((s) => s.id === id) ?? null);
  activeSources = (userId?: string) =>
    Promise.resolve(
      this.sources.filter((s) => s.active && (!userId || s.userId === userId)),
    );
  addSource(source: Pick<NewsSource, "userId" | "name" | "url" | "category">) {
    const saved: NewsSource = {
      ...source,
      id: `s${this.sources.length + 1}`,
      active: true,
      lastFetchedAt: null,
      lastError: null,
      createdAt: NOW,
    };
    this.sources.push(saved);
    return Promise.resolve(saved);
  }
  updateSource(id: string, change: Partial<NewsSource>) {
    Object.assign(this.sources.find((s) => s.id === id) ?? {}, change);
    return Promise.resolve();
  }
  removeSource(id: string) {
    this.sources = this.sources.filter((s) => s.id !== id);
    return Promise.resolve();
  }
  markFetched(id: string, at: Date, error: string | null) {
    return this.updateSource(id, { lastFetchedAt: at, lastError: error });
  }
  insertItems(sourceId: string, entries: FeedEntry[], now: Date) {
    const source = this.sources.find((s) => s.id === sourceId) as NewsSource;
    let added = 0;
    for (const entry of entries) {
      if (
        this.items.some((i) => i.sourceId === sourceId && i.link === entry.link)
      ) {
        continue;
      }
      added++;
      this.items.push({
        id: `i${this.items.length + 1}`,
        sourceId,
        sourceName: source.name,
        category: source.category,
        title: entry.title,
        link: entry.link,
        summary: entry.summary,
        publishedAt: entry.publishedAt ?? now,
        collected: now,
      });
    }
    return Promise.resolve(added);
  }
  pageItems(filter: NewsFilter) {
    this.filters.push(filter);
    const items = this.items.filter(
      (i) =>
        (!filter.category || i.category === filter.category) &&
        (!filter.from || i.publishedAt >= filter.from) &&
        (!filter.to || i.publishedAt < filter.to),
    );
    return Promise.resolve(
      paginate(items, items.length, { page: 1, limit: 20 }),
    );
  }
  categories = () => Promise.resolve(["tecnologia"]);
  purgeItemsBefore = () => Promise.resolve(0);
}

const entry = (title: string, publishedAt: string): FeedEntry => ({
  title,
  link: `https://news.example.com/${encodeURIComponent(title)}`,
  summary: null,
  publishedAt: new Date(publishedAt),
});

function setup(read: FeedReaderPort["read"]) {
  const repo = new InMemoryNews();
  const reader: FeedReaderPort = { read: jest.fn(read) };
  const clock = { now: () => NOW };
  const collector = new CollectNewsUseCase(repo, reader, clock);
  return {
    repo,
    reader,
    collector,
    getNews: new GetNewsUseCase(repo, collector),
    manage: new ManageNewsSourcesUseCase(repo, reader, clock),
  };
}

const codeOf = (error: unknown) =>
  error instanceof AppException
    ? (error.getResponse() as { code: string }).code
    : undefined;

describe("news domain", () => {
  it("accepts only public http(s) feed URLs", () => {
    expect(isAllowedFeedUrl("https://g1.globo.com/rss/g1/")).toBe(true);
    for (const url of [
      "ftp://example.com/feed",
      "http://localhost:4100/x",
      "http://127.0.0.1/feed",
      "http://192.168.0.10/feed",
      "http://10.1.2.3/feed",
      "http://[::1]/feed",
      "http://intranet/feed",
      "https://user:pass@example.com/feed",
    ]) {
      expect(isAllowedFeedUrl(url)).toBe(false);
    }
  });

  it("turns feed HTML into short plain text", () => {
    expect(plainText("<p>Olá&nbsp;<b>mundo</b> &amp; cia</p>", 50)).toBe(
      "Olá mundo & cia",
    );
    expect(plainText("abcdef", 4)).toBe("abc…");
  });
});

describe("ManageNewsSourcesUseCase", () => {
  it("adds a feed it can read and keeps its headlines", async () => {
    const t = setup(() =>
      Promise.resolve({
        title: "Tecmundo",
        entries: [entry("Nova GPU", "2026-11-23T12:00:00Z")],
      }),
    );
    const source = await t.manage.add(user, {
      url: "https://rss.tecmundo.com.br/feed",
      category: " Tecnologia ",
    });
    expect(source).toMatchObject({ name: "Tecmundo", category: "tecnologia" });
    expect(t.repo.items).toHaveLength(1);
    expect(t.repo.sources[0].lastFetchedAt).toEqual(NOW);
  });

  it("refuses bad, unreadable and repeated feeds", async () => {
    const t = setup(() => Promise.reject(new FeedReaderError("not a feed")));
    expect(
      codeOf(
        await t.manage
          .add(user, { url: "http://localhost/feed", category: "geral" })
          .catch((e) => e),
      ),
    ).toBe("NEWS_INVALID_FEED_URL");
    expect(
      codeOf(
        await t.manage
          .add(user, { url: "https://example.com/page", category: "geral" })
          .catch((e) => e),
      ),
    ).toBe("NEWS_UNREADABLE_FEED");
    await t.repo.addSource({
      userId: "u1",
      name: "g1",
      url: "https://g1.globo.com/rss/g1/",
      category: "geral",
    });
    expect(
      codeOf(
        await t.manage
          .add(user, { url: "https://g1.globo.com/rss/g1/", category: "geral" })
          .catch((e) => e),
      ),
    ).toBe("NEWS_DUPLICATE_SOURCE");
  });
});

describe("CollectNewsUseCase", () => {
  it("collects every feed and records the broken ones", async () => {
    const t = setup((url) =>
      url.includes("broken")
        ? Promise.reject(new FeedReaderError("HTTP 500."))
        : Promise.resolve({
            title: null,
            entries: [entry(`n-${url}`, "2026-11-23T10:00:00Z")],
          }),
    );
    for (const url of [
      "https://a.com/rss",
      "https://broken.com/rss",
      "https://b.com/rss",
    ]) {
      await t.repo.addSource({
        userId: "u1",
        name: url,
        url,
        category: "geral",
      });
    }
    const result = await t.collector.collect();
    expect(result).toEqual({ sources: 3, failed: 1, newItems: 2 });
    expect(t.repo.sources[1].lastError).toContain("HTTP 500");
    // Collecting again stores nothing new.
    expect((await t.collector.collect()).newItems).toBe(0);
  });
});

describe("GetNewsUseCase and NewsTool", () => {
  it("refreshes stale sources and filters yesterday in the owner time zone", async () => {
    const t = setup(() =>
      Promise.resolve({
        title: null,
        entries: [
          entry("ontem", "2026-11-22T20:00:00Z"),
          entry("hoje", "2026-11-23T11:00:00Z"),
        ],
      }),
    );
    await t.repo.addSource({
      userId: "u1",
      name: "g1",
      url: "https://g1.globo.com/rss/g1/",
      category: "geral",
    });
    const result = await t.getNews.execute(
      { userId: "u1", period: "YESTERDAY", timeZone: TZ, now: NOW },
      { page: 1, limit: 20 },
    );
    expect(t.reader.read).toHaveBeenCalledTimes(1);
    expect(result.items.map((i) => i.title)).toEqual(["ontem"]);
    expect(t.repo.filters[0]).toMatchObject({
      from: new Date("2026-11-22T03:00:00Z"),
      to: new Date("2026-11-23T03:00:00Z"),
    });
  });

  it("tells the model when there is no source", async () => {
    const t = setup(() => Promise.resolve({ title: null, entries: [] }));
    const context: ToolContext = {
      userId: "u1",
      timeZone: TZ,
      language: "pt-BR",
      location: null,
      now: NOW,
    };
    const result = await new NewsTool(t.getNews).execute({}, context);
    expect(result.error).toContain("no news feed");
  });
});

describe("RssFeedReaderAdapter", () => {
  afterEach(() => jest.restoreAllMocks());

  const serve = (body: string, status = 200) =>
    jest
      .spyOn(global, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(body, { status })),
      );

  it("reads RSS 2.0 with HTML and CDATA", async () => {
    serve(`<?xml version="1.0"?><rss version="2.0"><channel><title>g1 &gt; Tecnologia</title>
      <item><title><![CDATA[Nova lei de IA]]></title><link>https://g1.globo.com/a</link>
      <description><![CDATA[<img src="x"/><p>Resumo <b>aqui</b></p>]]></description>
      <pubDate>Sun, 23 Nov 2026 12:00:00 -0300</pubDate></item>
      <item><title>Sem link</title></item></channel></rss>`);
    const feed = await new RssFeedReaderAdapter().read(
      "https://g1.globo.com/rss",
    );
    expect(feed.title).toBe("g1 > Tecnologia");
    expect(feed.entries).toEqual([
      {
        title: "Nova lei de IA",
        link: "https://g1.globo.com/a",
        summary: "Resumo aqui",
        publishedAt: new Date("2026-11-23T15:00:00Z"),
      },
    ]);
  });

  it("reads Atom and refuses what is not a feed", async () => {
    serve(`<feed xmlns="http://www.w3.org/2005/Atom"><title>Blog</title>
      <entry><title>Post</title><link rel="alternate" href="https://blog.example.com/p"/>
      <updated>2026-11-22T10:00:00Z</updated><summary>Texto</summary></entry></feed>`);
    const atom = await new RssFeedReaderAdapter().read(
      "https://blog.example.com/atom",
    );
    expect(atom.entries[0]).toMatchObject({
      title: "Post",
      link: "https://blog.example.com/p",
    });

    jest.restoreAllMocks();
    serve("<html><body>Página</body></html>");
    await expect(
      new RssFeedReaderAdapter().read("https://example.com"),
    ).rejects.toBeInstanceOf(FeedReaderError);
  });
});
