import { Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import { SystemLogsService } from "@/modules/system-logs/application/system-logs.service";

// Daily cleanup called by the Routines workflow (Vercel Hobby has no crons).
@Controller("internal/maintenance")
@InternalRoute()
export class InternalMaintenanceController {
  constructor(private readonly logs: SystemLogsService) {}

  @Post("cleanup")
  @HttpCode(200)
  async cleanup(): Promise<{ systemLogs: number }> {
    return { systemLogs: await this.logs.purgeOld(new Date()) };
  }
}
