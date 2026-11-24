import type {
  FeedEntry,
  NewsItem,
  NewsSource,
} from "@/modules/news/domain/news";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type NewsFilter = {
  userId: string;
  /** Exact category (normalized). */
  category?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export interface NewsRepositoryPort {
  /** The owner's sources, oldest first (a few dozen at most). */
  listSources(userId: string): Promise<NewsSource[]>;
  findSource(id: string): Promise<NewsSource | null>;
  /** Active sources of every user (the collection routine). */
  activeSources(userId?: string): Promise<NewsSource[]>;
  addSource(
    source: Pick<NewsSource, "userId" | "name" | "url" | "category">,
  ): Promise<NewsSource>;
  updateSource(
    id: string,
    change: Partial<Pick<NewsSource, "name" | "category" | "active">>,
  ): Promise<void>;
  removeSource(id: string): Promise<void>;
  markFetched(id: string, at: Date, error: string | null): Promise<void>;
  /** Stores the entries not seen yet; returns how many were new. */
  insertItems(
    sourceId: string,
    entries: FeedEntry[],
    now: Date,
  ): Promise<number>;
  /** Newest first. */
  pageItems(
    filter: NewsFilter,
    page: PageRequest,
  ): Promise<Paginated<NewsItem>>;
  /** Categories that have items, for the filters. */
  categories(userId: string): Promise<string[]>;
  purgeItemsBefore(before: Date): Promise<number>;
}

export const NEWS_REPOSITORY = Symbol("NEWS_REPOSITORY");
