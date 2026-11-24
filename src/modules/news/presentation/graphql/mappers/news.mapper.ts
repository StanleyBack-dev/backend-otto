import type { NewsItem, NewsSource } from "@/modules/news/domain/news";
import type { NewsItemOutput } from "@/modules/news/presentation/graphql/dto/outputs/news-item.output";
import type { NewsSourceOutput } from "@/modules/news/presentation/graphql/dto/outputs/news-source.output";

export function toNewsSourceOutput(source: NewsSource): NewsSourceOutput {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    category: source.category,
    active: source.active,
    lastFetchedAt: source.lastFetchedAt,
    lastError: source.lastError,
  };
}

export function toNewsItemOutput(item: NewsItem): NewsItemOutput {
  return {
    id: item.id,
    title: item.title,
    link: item.link,
    summary: item.summary,
    publishedAt: item.publishedAt,
    sourceName: item.sourceName,
    category: item.category,
  };
}
