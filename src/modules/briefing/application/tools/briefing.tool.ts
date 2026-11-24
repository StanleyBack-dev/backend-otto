import { Injectable } from "@nestjs/common";
import type {
  AssistantTool,
  ToolContext,
} from "@/modules/assistant/domain/assistant-tool";
import { GenerateBriefingUseCase } from "@/modules/briefing/application/use-cases/generate-briefing.use-case";

// "Bom dia", "Qual o resumo de hoje?", "Me conta como vai ser o dia".
@Injectable()
export class BriefingTool implements AssistantTool {
  readonly name = "get_briefing";
  readonly description =
    "Today's morning briefing (weather, agenda and yesterday's headlines), already written to be spoken. Use it when the owner says good morning or asks for the day's summary; answer with its text as it is.";
  readonly parameters = { type: "object" as const, properties: {} };

  constructor(private readonly briefings: GenerateBriefingUseCase) {}

  async execute(
    _args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>> {
    const briefing = await this.briefings.today(context.userId);
    return {
      date: briefing.date,
      text: briefing.text,
      preparedAt: briefing.createdAt.toISOString(),
    };
  }
}
