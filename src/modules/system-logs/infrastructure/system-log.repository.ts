import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { SystemLogRepositoryPort } from "@/modules/system-logs/application/ports/system-log-repository.port";
import type { SystemLog } from "@/modules/system-logs/domain/system-log";
import { SystemLogOrmEntity } from "@/modules/system-logs/infrastructure/system-log.orm-entity";

@Injectable()
export class SystemLogRepository implements SystemLogRepositoryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async insert(log: Omit<SystemLog, "id" | "createdAt">): Promise<void> {
    await this.dataSource.getRepository(SystemLogOrmEntity).insert({
      ...log,
      details: log.details as QueryDeepPartialEntity<
        SystemLogOrmEntity["details"]
      >,
    });
  }

  async purgeBefore(before: Date): Promise<number> {
    const result = await this.dataSource
      .getRepository(SystemLogOrmEntity)
      .createQueryBuilder()
      .delete()
      .where("created_at < :before", { before })
      .execute();
    return result.affected ?? 0;
  }
}
