import { Inject } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PageInput } from "@/common/graphql/pagination.graphql";
import {
  BRIEFING_REPOSITORY,
  type BriefingRepositoryPort,
} from "@/modules/briefing/application/ports/briefing-repository.port";
import { GenerateBriefingUseCase } from "@/modules/briefing/application/use-cases/generate-briefing.use-case";
import {
  BriefingOutput,
  BriefingPage,
} from "@/modules/briefing/presentation/graphql/dto/outputs/briefing.output";
import { toBriefingOutput } from "@/modules/briefing/presentation/graphql/mappers/briefing.mapper";

@Resolver()
export class BriefingResolver {
  constructor(
    private readonly generator: GenerateBriefingUseCase,
    @Inject(BRIEFING_REPOSITORY)
    private readonly briefings: BriefingRepositoryPort,
  ) {}

  @Query(() => BriefingOutput, {
    description:
      "Resumo de hoje (gerado na hora se a rotina ainda não preparou).",
  })
  async todayBriefing(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BriefingOutput> {
    return toBriefingOutput(await this.generator.today(user.id));
  }

  @Mutation(() => BriefingOutput, {
    description: "Refaz o resumo de hoje com os dados atuais.",
  })
  async regenerateBriefing(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BriefingOutput> {
    return toBriefingOutput(await this.generator.generate(user.id));
  }

  @Query(() => BriefingPage, { description: "Resumos anteriores." })
  async myBriefings(
    @CurrentUser() user: AuthenticatedUser,
    @Args("page", { nullable: true }) page?: PageInput,
  ): Promise<BriefingPage> {
    const result = await this.briefings.page(user.id, page ?? new PageInput());
    return { ...result, items: result.items.map(toBriefingOutput) };
  }
}
