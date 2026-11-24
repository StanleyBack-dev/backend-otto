import type { Briefing } from "@/modules/briefing/domain/briefing";
import type { BriefingOutput } from "@/modules/briefing/presentation/graphql/dto/outputs/briefing.output";

export function toBriefingOutput(briefing: Briefing): BriefingOutput {
  return {
    id: briefing.id,
    date: briefing.date,
    text: briefing.text,
    writtenByModel: briefing.writtenByModel,
    unavailable: briefing.sections.unavailable,
    createdAt: briefing.createdAt,
  };
}
