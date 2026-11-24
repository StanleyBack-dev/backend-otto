import { Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import {
  RunDueBriefingsUseCase,
  type RunResult,
} from "@/modules/briefing/application/use-cases/run-due-briefings.use-case";

// Called by the Routines workflow: hourly preparation and daily cleanup.
@Controller("internal/briefing")
@InternalRoute()
export class InternalBriefingController {
  constructor(private readonly runner: RunDueBriefingsUseCase) {}

  @Post("run")
  @HttpCode(200)
  run(): Promise<RunResult> {
    return this.runner.run();
  }

  @Post("cleanup")
  @HttpCode(200)
  async cleanup(): Promise<{ briefings: number }> {
    return { briefings: await this.runner.purgeOld() };
  }
}
