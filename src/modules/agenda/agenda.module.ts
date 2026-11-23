import { Module, type OnModuleInit } from "@nestjs/common";
import { CALENDAR_PROVIDER } from "@/modules/agenda/application/ports/calendar-provider.port";
import { AgendaTool } from "@/modules/agenda/application/tools/agenda.tool";
import { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import { AppsScriptCalendarAdapter } from "@/modules/agenda/infrastructure/apps-script-calendar.adapter";
import { AgendaResolver } from "@/modules/agenda/presentation/graphql/agenda.resolver";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { IdentityModule } from "@/modules/identity/identity.module";

// The owner's calendars (Google Calendar via Apps Script) for the app and
// the assistant.
@Module({
  imports: [AssistantModule, IdentityModule],
  providers: [
    GetAgendaUseCase,
    AgendaTool,
    AgendaResolver,
    { provide: CALENDAR_PROVIDER, useClass: AppsScriptCalendarAdapter },
  ],
  exports: [GetAgendaUseCase],
})
export class AgendaModule implements OnModuleInit {
  constructor(
    private readonly tools: AssistantToolRegistry,
    private readonly agendaTool: AgendaTool,
  ) {}

  onModuleInit(): void {
    this.tools.register(this.agendaTool);
  }
}
