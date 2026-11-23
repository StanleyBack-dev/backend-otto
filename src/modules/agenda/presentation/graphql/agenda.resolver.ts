import { Inject } from "@nestjs/common";
import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { CalendarProviderError } from "@/modules/agenda/application/ports/calendar-provider.port";
import { GetAgendaUseCase } from "@/modules/agenda/application/use-cases/get-agenda.use-case";
import { AgendaOutput } from "@/modules/agenda/presentation/graphql/dto/outputs/agenda.output";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

// For the app agenda screen. The assistant reads the same data through the
// get_agenda tool.
@Resolver()
export class AgendaResolver {
  constructor(
    private readonly getAgenda: GetAgendaUseCase,
    private readonly settings: MySettingsUseCase,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  @Query(() => AgendaOutput, {
    description: "Compromissos de um ou mais dias (padrão: hoje).",
  })
  async agenda(
    @CurrentUser() user: AuthenticatedUser,
    @Args("date", {
      type: () => String,
      nullable: true,
      description: "YYYY-MM-DD",
    })
    date?: string,
    @Args("days", { type: () => Int, nullable: true }) days?: number,
  ): Promise<AgendaOutput> {
    const { timeZone } = await this.settings.forUser(user.id);
    try {
      return await this.getAgenda.execute({
        date,
        days,
        timeZone,
        now: this.clock.now(),
      });
    } catch (error) {
      if (error instanceof CalendarProviderError) {
        throw AppException.from(
          error.reason === "NOT_CONFIGURED"
            ? APP_ERRORS.agenda.notConnected
            : APP_ERRORS.agenda.unavailable,
          undefined,
        );
      }
      throw error;
    }
  }
}
