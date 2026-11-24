import { Inject, Injectable, Logger } from "@nestjs/common";
import { redact } from "@/common/logging/redact";
import { reportSystemEvent } from "@/common/logging/system-events";
import {
  FEED_READER,
  type FeedReaderPort,
} from "@/modules/news/application/ports/feed-reader.port";
import {
  NEWS_REPOSITORY,
  type NewsRepositoryPort,
} from "@/modules/news/application/ports/news-repository.port";
import {
  NEWS_RETENTION_DAYS,
  type NewsSource,
} from "@/modules/news/domain/news";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type CollectResult = {
  sources: number;
  failed: number;
  newItems: number;
};

const CONCURRENCY = 4;

// Reads the feeds and stores the new headlines. Runs from the Routines
// workflow and, for one owner, right before answering when the sources are
// stale. A broken feed is recorded on its source and never stops the rest.
@Injectable()
export class CollectNewsUseCase {
  private readonly logger = new Logger(CollectNewsUseCase.name);

  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort,
    @Inject(FEED_READER) private readonly reader: FeedReaderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async collect(userId?: string): Promise<CollectResult> {
    const sources = await this.news.activeSources(userId);
    const result: CollectResult = {
      sources: sources.length,
      failed: 0,
      newItems: 0,
    };
    const queue = [...sources];
    const worker = async () => {
      for (let source = queue.shift(); source; source = queue.shift()) {
        const added = await this.collectSource(source);
        if (added === null) result.failed++;
        else result.newItems += added;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (result.failed > 0 && !userId) {
      reportSystemEvent({
        level: "WARN",
        category: "ROUTINE",
        source: "News collection",
        message: `${result.failed} of ${result.sources} feeds failed.`,
      });
    }
    return result;
  }

  /** Daily cleanup: headlines older than the retention. */
  purgeOld(): Promise<number> {
    return this.news.purgeItemsBefore(
      new Date(this.clock.now().getTime() - NEWS_RETENTION_DAYS * 86_400_000),
    );
  }

  /** New items stored, or null when the feed failed. */
  private async collectSource(source: NewsSource): Promise<number | null> {
    const now = this.clock.now();
    try {
      const feed = await this.reader.read(source.url);
      const added = await this.news.insertItems(source.id, feed.entries, now);
      await this.news.markFetched(source.id, now, null);
      return added;
    } catch (error) {
      const message = redact(
        error instanceof Error ? error.message : "Unknown error",
      ).slice(0, 300);
      this.logger.warn(`Feed ${source.name} failed: ${message}`);
      await this.news.markFetched(source.id, now, message).catch(() => {});
      return null;
    }
  }
}
