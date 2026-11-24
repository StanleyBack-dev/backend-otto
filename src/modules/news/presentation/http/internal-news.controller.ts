import { Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import {
  CollectNewsUseCase,
  type CollectResult,
} from "@/modules/news/application/use-cases/collect-news.use-case";

// Called by the Routines workflow: collection a few times a day and the
// daily cleanup.
@Controller("internal/news")
@InternalRoute()
export class InternalNewsController {
  constructor(private readonly collector: CollectNewsUseCase) {}

  @Post("collect")
  @HttpCode(200)
  collect(): Promise<CollectResult> {
    return this.collector.collect();
  }

  @Post("cleanup")
  @HttpCode(200)
  async cleanup(): Promise<{ items: number }> {
    return { items: await this.collector.purgeOld() };
  }
}
