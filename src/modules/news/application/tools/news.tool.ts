import { Injectable } from "@nestjs/common";
import type {
  AssistantTool,
  ToolContext,
} from "@/modules/assistant/domain/assistant-tool";
import {
  GetNewsUseCase,
  type NewsPeriod,
} from "@/modules/news/application/use-cases/get-news.use-case";
import { localDate, localTime } from "@/shared/domain/local-time";

const PERIODS: NewsPeriod[] = ["TODAY", "YESTERDAY", "RECENT"];
const MAX_ITEMS = 15;

// "Quais as notícias de ontem?", "O que saiu de tecnologia hoje?"
@Injectable()
export class NewsTool implements AssistantTool {
  readonly name = "get_news";
  readonly description =
    "Headlines from the news feeds the owner follows. Use it for news, what happened, main events of today or yesterday. Summarize the most important ones; do not read them all.";
  readonly parameters = {
    type: "object" as const,
    properties: {
      period: {
        type: "string" as const,
        description:
          "TODAY (since midnight), YESTERDAY (the whole previous day) or RECENT (last 24 hours). Default RECENT.",
        enum: PERIODS,
      },
      category: {
        type: "string" as const,
        description:
          "Optional category the owner gave the feeds, e.g. 'tecnologia', 'geral', 'economia'.",
      },
    },
  };

  constructor(private readonly news: GetNewsUseCase) {}

  async execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>> {
    const period = PERIODS.includes(args.period as NewsPeriod)
      ? (args.period as NewsPeriod)
      : "RECENT";
    const result = await this.news.execute(
      {
        userId: context.userId,
        period,
        category: typeof args.category === "string" ? args.category : null,
        timeZone: context.timeZone,
        now: context.now,
      },
      { page: 1, limit: MAX_ITEMS },
    );
    if (result.sources === 0) {
      return {
        error:
          "The owner follows no news feed yet. Tell them to add sources in the app settings.",
      };
    }
    return {
      period,
      total: result.total,
      categories: await this.news.categories(context.userId),
      items: result.items.map((item) => ({
        title: item.title,
        source: item.sourceName,
        category: item.category,
        publishedAt: `${localDate(item.publishedAt, context.timeZone)} ${localTime(item.publishedAt, context.timeZone)}`,
        summary: item.summary?.slice(0, 200) ?? null,
      })),
    };
  }
}
