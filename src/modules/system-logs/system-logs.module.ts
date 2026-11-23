import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SYSTEM_LOG_REPOSITORY } from "@/modules/system-logs/application/ports/system-log-repository.port";
import { SystemLogsService } from "@/modules/system-logs/application/system-logs.service";
import { SystemLogOrmEntity } from "@/modules/system-logs/infrastructure/system-log.orm-entity";
import { SystemLogRepository } from "@/modules/system-logs/infrastructure/system-log.repository";
import { InternalMaintenanceController } from "@/modules/system-logs/presentation/internal-maintenance.controller";
import { SystemLogsPlugin } from "@/modules/system-logs/presentation/system-logs.plugin";

// The system log: unexpected errors, refused requests and failed routines.
@Module({
  imports: [TypeOrmModule.forFeature([SystemLogOrmEntity])],
  controllers: [InternalMaintenanceController],
  providers: [
    SystemLogsService,
    { provide: SYSTEM_LOG_REPOSITORY, useClass: SystemLogRepository },
    SystemLogsPlugin,
  ],
  exports: [SystemLogsService],
})
export class SystemLogsModule {}
