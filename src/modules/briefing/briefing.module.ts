import { Module, type OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgendaModule } from "@/modules/agenda/agenda.module";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { BRIEFING_REPOSITORY } from "@/modules/briefing/application/ports/briefing-repository.port";
import { BriefingTool } from "@/modules/briefing/application/tools/briefing.tool";
import { GenerateBriefingUseCase } from "@/modules/briefing/application/use-cases/generate-briefing.use-case";
import { RunDueBriefingsUseCase } from "@/modules/briefing/application/use-cases/run-due-briefings.use-case";
import { BriefingOrmEntity } from "@/modules/briefing/infrastructure/persistence/entities/briefing.orm-entity";
import { BriefingTypeormRepository } from "@/modules/briefing/infrastructure/persistence/repositories/briefing-typeorm.repository";
import { BriefingResolver } from "@/modules/briefing/presentation/graphql/briefing.resolver";
import { InternalBriefingController } from "@/modules/briefing/presentation/http/internal-briefing.controller";
import { IdentityModule } from "@/modules/identity/identity.module";
import { NewsModule } from "@/modules/news/news.module";
import { WeatherModule } from "@/modules/weather/weather.module";

// The morning briefing: agenda + weather + yesterday's news, written by the
// AI model and prepared by the Routines workflow before the owner's time.
@Module({
  imports: [
    TypeOrmModule.forFeature([BriefingOrmEntity]),
    AssistantModule,
    IdentityModule,
    AgendaModule,
    WeatherModule,
    NewsModule,
  ],
  controllers: [InternalBriefingController],
  providers: [
    GenerateBriefingUseCase,
    RunDueBriefingsUseCase,
    BriefingTool,
    BriefingResolver,
    { provide: BRIEFING_REPOSITORY, useClass: BriefingTypeormRepository },
  ],
})
export class BriefingModule implements OnModuleInit {
  constructor(
    private readonly tools: AssistantToolRegistry,
    private readonly briefingTool: BriefingTool,
  ) {}

  onModuleInit(): void {
    this.tools.register(this.briefingTool);
  }
}
