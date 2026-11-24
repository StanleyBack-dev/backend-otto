import { Inject, Injectable } from "@nestjs/common";
import {
  NEWS_REPOSITORY,
  type NewsRepositoryPort,
} from "@/modules/news/application/ports/news-repository.port";
import { CollectNewsUseCase } from "@/modules/news/application/use-cases/collect-news.use-case";
import {
  normalizeCategory,
  STALE_AFTER_MS,
  type NewsItem,
} from "@/modules/news/domain/news";
import type { PageRequest, Paginated } from "@/shared/application/pagination";
import {
  addDays,
  localDate,
  startOfLocalDate,
} from "@/shared/domain/local-time";

export type NewsPeriod = "TODAY" | "YESTERDAY" | "RECENT";

export type NewsRequest = {
  userId: string;
  period: NewsPeriod;
  category?: string | null;
  timeZone: string;
  now: Date;
};

// Headlines of a period in the owner's time zone. Before answering, stale
// sources are refreshed, so the assistant has news even if the routine has
// not run yet.
@Injectable()
export class GetNewsUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort,
    private readonly collector: CollectNewsUseCase,
  ) {}

  async execute(
    request: NewsRequest,
    page: PageRequest,
  ): Promise<Paginated<NewsItem> & { sources: number }> {
    const sources = (await this.news.listSources(request.userId)).filter(
      (source) => source.active,
    );
    const stale = sources.some(
      (source) =>
        !source.lastFetchedAt ||
        request.now.getTime() - source.lastFetchedAt.getTime() > STALE_AFTER_MS,
    );
    if (stale) await this.collector.collect(request.userId);

    const range = this.range(request);
    const items = await this.news.pageItems(
      {
        userId: request.userId,
        category: request.category ? normalizeCategory(request.category) : null,
        ...range,
      },
      page,
    );
    return { ...items, sources: sources.length };
  }

  categories(userId: string): Promise<string[]> {
    return this.news.categories(userId);
  }

  private range(request: NewsRequest): { from: Date; to: Date } {
    const today = localDate(request.now, request.timeZone);
    switch (request.period) {
      case "TODAY":
        return {
          from: startOfLocalDate(today, request.timeZone),
          to: request.now,
        };
      case "YESTERDAY":
        return {
          from: startOfLocalDate(addDays(today, -1), request.timeZone),
          to: startOfLocalDate(today, request.timeZone),
        };
      default:
        return {
          from: new Date(request.now.getTime() - 24 * 60 * 60_000),
          to: request.now,
        };
    }
  }
}
