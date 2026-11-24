import { Inject, ParseUUIDPipe } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PageInput } from "@/common/graphql/pagination.graphql";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { GetNewsUseCase } from "@/modules/news/application/use-cases/get-news.use-case";
import { ManageNewsSourcesUseCase } from "@/modules/news/application/use-cases/manage-news-sources.use-case";
import { SUGGESTED_SOURCES } from "@/modules/news/domain/news";
import { AddNewsSourceInput } from "@/modules/news/presentation/graphql/dto/inputs/add-news-source.input";
import { UpdateNewsSourceInput } from "@/modules/news/presentation/graphql/dto/inputs/update-news-source.input";
import { NewsItemPage } from "@/modules/news/presentation/graphql/dto/outputs/news-item.output";
import {
  NewsSourceOutput,
  SuggestedNewsSourceOutput,
} from "@/modules/news/presentation/graphql/dto/outputs/news-source.output";
import {
  toNewsItemOutput,
  toNewsSourceOutput,
} from "@/modules/news/presentation/graphql/mappers/news.mapper";
import { NewsPeriodInput } from "@/modules/news/presentation/graphql/news.graphql-enums";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

@Resolver()
export class NewsResolver {
  constructor(
    private readonly getNews: GetNewsUseCase,
    private readonly sources: ManageNewsSourcesUseCase,
    private readonly settings: MySettingsUseCase,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  @Query(() => NewsItemPage, {
    description: "Manchetes das suas fontes, da mais nova para a mais antiga.",
  })
  async news(
    @CurrentUser() user: AuthenticatedUser,
    @Args("period", { type: () => NewsPeriodInput, nullable: true })
    period?: NewsPeriodInput,
    @Args("category", { type: () => String, nullable: true })
    category?: string,
    @Args("page", { nullable: true }) page?: PageInput,
  ): Promise<NewsItemPage> {
    const { timeZone } = await this.settings.forUser(user.id);
    const result = await this.getNews.execute(
      {
        userId: user.id,
        period: period ?? NewsPeriodInput.RECENT,
        category,
        timeZone,
        now: this.clock.now(),
      },
      page ?? new PageInput(),
    );
    return {
      items: result.items.map(toNewsItemOutput),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Query(() => [NewsSourceOutput], { description: "Fontes que você segue." })
  async newsSources(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NewsSourceOutput[]> {
    return (await this.sources.list(user)).map(toNewsSourceOutput);
  }

  @Query(() => [SuggestedNewsSourceOutput], {
    description: "Sugestões de feeds para começar.",
  })
  suggestedNewsSources(): SuggestedNewsSourceOutput[] {
    return SUGGESTED_SOURCES.map((source) => ({ ...source }));
  }

  @Mutation(() => NewsSourceOutput, {
    description: "Segue um feed RSS/Atom (o endereço é conferido na hora).",
  })
  async addNewsSource(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: AddNewsSourceInput,
  ): Promise<NewsSourceOutput> {
    return toNewsSourceOutput(await this.sources.add(user, input));
  }

  @Mutation(() => NewsSourceOutput)
  async updateNewsSource(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: UpdateNewsSourceInput,
  ): Promise<NewsSourceOutput> {
    return toNewsSourceOutput(await this.sources.update(user, input.id, input));
  }

  @Mutation(() => Boolean)
  async removeNewsSource(
    @CurrentUser() user: AuthenticatedUser,
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    await this.sources.remove(user, id);
    return true;
  }
}
