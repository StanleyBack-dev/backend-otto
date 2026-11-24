import { Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  FEED_READER,
  FeedReaderError,
  type FeedReaderPort,
} from "@/modules/news/application/ports/feed-reader.port";
import {
  NEWS_REPOSITORY,
  type NewsRepositoryPort,
} from "@/modules/news/application/ports/news-repository.port";
import {
  isAllowedFeedUrl,
  normalizeCategory,
  SOURCE_NAME_MAX,
  type NewsSource,
} from "@/modules/news/domain/news";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export const MAX_SOURCES = 30;

// The feeds the owner follows: add (checked by reading it), rename,
// recategorize, pause and remove.
@Injectable()
export class ManageNewsSourcesUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort,
    @Inject(FEED_READER) private readonly reader: FeedReaderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  list(user: AuthenticatedUser): Promise<NewsSource[]> {
    return this.news.listSources(user.id);
  }

  async add(
    user: AuthenticatedUser,
    input: { url: string; name?: string | null; category: string },
  ): Promise<NewsSource> {
    const url = input.url.trim();
    if (!isAllowedFeedUrl(url)) {
      throw AppException.from(APP_ERRORS.news.invalidFeedUrl, undefined);
    }
    const sources = await this.news.listSources(user.id);
    if (sources.some((source) => source.url === url)) {
      throw AppException.from(APP_ERRORS.news.duplicateSource, undefined);
    }
    if (sources.length >= MAX_SOURCES) {
      throw AppException.from(APP_ERRORS.news.tooManySources, {
        max: MAX_SOURCES,
      });
    }
    const category = this.category(input.category);

    let feed: Awaited<ReturnType<FeedReaderPort["read"]>>;
    try {
      feed = await this.reader.read(url);
    } catch (error) {
      if (error instanceof FeedReaderError) {
        throw AppException.from(APP_ERRORS.news.unreadableFeed, undefined);
      }
      throw error;
    }
    const name = (
      input.name?.trim() ||
      feed.title ||
      new URL(url).hostname
    ).slice(0, SOURCE_NAME_MAX);
    const source = await this.news.addSource({
      userId: user.id,
      name,
      url,
      category,
    });
    // The feed was just read: keep its headlines instead of fetching again.
    const now = this.clock.now();
    await this.news.insertItems(source.id, feed.entries, now);
    await this.news.markFetched(source.id, now, null);
    return { ...source, lastFetchedAt: now };
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    change: {
      name?: string | null;
      category?: string | null;
      active?: boolean | null;
    },
  ): Promise<NewsSource> {
    const source = await this.owned(user, id);
    const next: Partial<Pick<NewsSource, "name" | "category" | "active">> = {};
    if (change.name != null) {
      const name = change.name.trim().slice(0, SOURCE_NAME_MAX);
      if (name.length < 2) {
        throw AppException.from(APP_ERRORS.news.invalidSource, {
          reason: "O nome da fonte deve ter pelo menos 2 caracteres.",
        });
      }
      next.name = name;
    }
    if (change.category != null) next.category = this.category(change.category);
    if (change.active != null) next.active = change.active;
    await this.news.updateSource(id, next);
    return { ...source, ...next };
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.owned(user, id);
    await this.news.removeSource(id);
  }

  private category(value: string): string {
    const category = normalizeCategory(value);
    if (category.length < 2) {
      throw AppException.from(APP_ERRORS.news.invalidSource, {
        reason: "A categoria deve ter pelo menos 2 caracteres.",
      });
    }
    return category;
  }

  private async owned(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NewsSource> {
    const source = await this.news.findSource(id);
    if (!source || source.userId !== user.id) {
      throw AppException.from(APP_ERRORS.news.sourceNotFound, undefined);
    }
    return source;
  }
}
