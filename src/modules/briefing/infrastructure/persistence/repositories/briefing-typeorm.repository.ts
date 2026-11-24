import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { BriefingRepositoryPort } from "@/modules/briefing/application/ports/briefing-repository.port";
import type { Briefing } from "@/modules/briefing/domain/briefing";
import { BriefingOrmEntity } from "@/modules/briefing/infrastructure/persistence/entities/briefing.orm-entity";
import {
  paginate,
  type PageRequest,
  type Paginated,
} from "@/shared/application/pagination";

@Injectable()
export class BriefingTypeormRepository implements BriefingRepositoryPort {
  constructor(
    @InjectRepository(BriefingOrmEntity)
    private readonly briefings: Repository<BriefingOrmEntity>,
  ) {}

  findByDate(userId: string, date: string): Promise<Briefing | null> {
    return this.briefings.findOneBy({ userId, date });
  }

  async save(briefing: Omit<Briefing, "id" | "createdAt">): Promise<Briefing> {
    // A regenerated briefing replaces the one of that date (new created_at).
    await this.briefings.delete({
      userId: briefing.userId,
      date: briefing.date,
    });
    await this.briefings.insert({
      ...briefing,
      sections: briefing.sections as QueryDeepPartialEntity<
        BriefingOrmEntity["sections"]
      >,
    });
    return (await this.findByDate(briefing.userId, briefing.date)) as Briefing;
  }

  async page(userId: string, page: PageRequest): Promise<Paginated<Briefing>> {
    const [items, total] = await this.briefings.findAndCount({
      where: { userId },
      order: { date: "DESC" },
      skip: (page.page - 1) * page.limit,
      take: page.limit,
    });
    return paginate(items, total, page);
  }

  async purgeBefore(date: string): Promise<number> {
    const result = await this.briefings
      .createQueryBuilder()
      .delete()
      .where("local_date < :date", { date })
      .execute();
    return result.affected ?? 0;
  }
}
