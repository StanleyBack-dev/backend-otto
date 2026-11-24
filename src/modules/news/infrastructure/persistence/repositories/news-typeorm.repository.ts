import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import type {
  NewsFilter,
  NewsRepositoryPort,
} from "@/modules/news/application/ports/news-repository.port";
import type {
  FeedEntry,
  NewsItem,
  NewsSource,
} from "@/modules/news/domain/news";
import { NewsItemOrmEntity } from "@/modules/news/infrastructure/persistence/entities/news-item.orm-entity";
import { NewsSourceOrmEntity } from "@/modules/news/infrastructure/persistence/entities/news-source.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

@Injectable()
export class NewsTypeormRepository implements NewsRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get sources() {
    return this.dataSource.getRepository(NewsSourceOrmEntity);
  }

  private get items() {
    return this.dataSource.getRepository(NewsItemOrmEntity);
  }

  listSources(userId: string): Promise<NewsSource[]> {
    return this.sources.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
  }

  findSource(id: string): Promise<NewsSource | null> {
    return this.sources.findOneBy({ id });
  }

  activeSources(userId?: string): Promise<NewsSource[]> {
    return this.sources.find({
      where: userId ? { userId, active: true } : { active: true },
    });
  }

  addSource(
    source: Pick<NewsSource, "userId" | "name" | "url" | "category">,
  ): Promise<NewsSource> {
    return this.sources.save(this.sources.create(source));
  }

  async updateSource(
    id: string,
    change: Partial<Pick<NewsSource, "name" | "category" | "active">>,
  ): Promise<void> {
    if (Object.keys(change).length > 0) {
      await this.sources.update({ id }, change);
    }
  }

  async removeSource(id: string): Promise<void> {
    await this.sources.delete({ id });
  }

  async markFetched(id: string, at: Date, error: string | null): Promise<void> {
    await this.sources.update({ id }, { lastFetchedAt: at, lastError: error });
  }

  async insertItems(
    sourceId: string,
    entries: FeedEntry[],
    now: Date,
  ): Promise<number> {
    const unique = [
      ...new Map(entries.map((entry) => [entry.link, entry])).values(),
    ];
    if (unique.length === 0) return 0;
    const result = await this.items
      .createQueryBuilder()
      .insert()
      .values(
        unique.map((entry) => ({
          sourceId,
          title: entry.title,
          link: entry.link,
          summary: entry.summary,
          // A feed date in the future would pin the item on top.
          publishedAt:
            entry.publishedAt && entry.publishedAt <= now
              ? entry.publishedAt
              : now,
          collectedAt: now,
        })),
      )
      .orIgnore()
      .returning(["id"])
      .execute();
    // ON CONFLICT DO NOTHING returns only the rows actually inserted.
    return Array.isArray(result.raw) ? result.raw.length : 0;
  }

  async pageItems(
    filter: NewsFilter,
    page: PageRequest,
  ): Promise<Paginated<NewsItem>> {
    const query = this.items
      .createQueryBuilder("i")
      .innerJoin(
        NewsSourceOrmEntity,
        "s",
        "s.idtb_news_sources = i.idtb_news_sources",
      )
      .where("s.idtb_users = :userId", { userId: filter.userId });
    if (filter.category) {
      query.andWhere("s.category = :category", { category: filter.category });
    }
    if (filter.from)
      query.andWhere("i.published_at >= :from", { from: filter.from });
    if (filter.to) query.andWhere("i.published_at < :to", { to: filter.to });

    const total = await query.getCount();
    const rows = await query
      .select([
        "i.idtb_news_items AS id",
        'i.idtb_news_sources AS "sourceId"',
        's.name AS "sourceName"',
        "s.category AS category",
        "i.title AS title",
        "i.link AS link",
        "i.summary AS summary",
        'i.published_at AS "publishedAt"',
      ])
      .orderBy("i.published_at", "DESC")
      .offset((page.page - 1) * page.limit)
      .limit(page.limit)
      .getRawMany<NewsItem>();
    return paginate(
      rows.map((row) => ({ ...row, publishedAt: new Date(row.publishedAt) })),
      total,
      page,
    );
  }

  async categories(userId: string): Promise<string[]> {
    const rows = await this.sources
      .createQueryBuilder("s")
      .select("DISTINCT s.category", "category")
      .where("s.idtb_users = :userId AND s.active", { userId })
      .orderBy("category")
      .getRawMany<{ category: string }>();
    return rows.map((row) => row.category);
  }

  async purgeItemsBefore(before: Date): Promise<number> {
    const result = await this.items
      .createQueryBuilder()
      .delete()
      .where("published_at < :before", { before })
      .execute();
    return result.affected ?? 0;
  }
}
