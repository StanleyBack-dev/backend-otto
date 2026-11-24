import { Module, type OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AssistantToolRegistry } from "@/modules/assistant/application/assistant-tool.registry";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { FEED_READER } from "@/modules/news/application/ports/feed-reader.port";
import { NEWS_REPOSITORY } from "@/modules/news/application/ports/news-repository.port";
import { NewsTool } from "@/modules/news/application/tools/news.tool";
import { CollectNewsUseCase } from "@/modules/news/application/use-cases/collect-news.use-case";
import { GetNewsUseCase } from "@/modules/news/application/use-cases/get-news.use-case";
import { ManageNewsSourcesUseCase } from "@/modules/news/application/use-cases/manage-news-sources.use-case";
import { NewsItemOrmEntity } from "@/modules/news/infrastructure/persistence/entities/news-item.orm-entity";
import { NewsSourceOrmEntity } from "@/modules/news/infrastructure/persistence/entities/news-source.orm-entity";
import { NewsTypeormRepository } from "@/modules/news/infrastructure/persistence/repositories/news-typeorm.repository";
import { RssFeedReaderAdapter } from "@/modules/news/infrastructure/rss-feed-reader.adapter";
import { NewsResolver } from "@/modules/news/presentation/graphql/news.resolver";
import { InternalNewsController } from "@/modules/news/presentation/http/internal-news.controller";

// News feeds chosen by the owner, the collected headlines and the get_news
// assistant tool.
@Module({
  imports: [
    TypeOrmModule.forFeature([NewsSourceOrmEntity, NewsItemOrmEntity]),
    AssistantModule,
    IdentityModule,
  ],
  controllers: [InternalNewsController],
  providers: [
    CollectNewsUseCase,
    GetNewsUseCase,
    ManageNewsSourcesUseCase,
    NewsTool,
    NewsResolver,
    { provide: NEWS_REPOSITORY, useClass: NewsTypeormRepository },
    { provide: FEED_READER, useClass: RssFeedReaderAdapter },
  ],
  exports: [GetNewsUseCase],
})
export class NewsModule implements OnModuleInit {
  constructor(
    private readonly tools: AssistantToolRegistry,
    private readonly newsTool: NewsTool,
  ) {}

  onModuleInit(): void {
    this.tools.register(this.newsTool);
  }
}
