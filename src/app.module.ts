import { Module, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import type { ApolloDriverConfig } from "@nestjs/apollo";
import { AppController } from "@/app.controller";
import { AppResolver } from "@/app.resolver";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { buildGraphqlConfig } from "@/common/graphql/graphql.config";
import { ClientApiKeyGuard } from "@/common/security/client-api-key.guard";
import { AppConfigModule } from "@/config/config.module";
import { DatabaseModule } from "@/database/database.module";
import { AssistantModule } from "@/modules/assistant/assistant.module";
import { IdentityModule } from "@/modules/identity/identity.module";
import { UserSessionGuard } from "@/modules/identity/presentation/guards/user-session.guard";
import { SystemLogsModule } from "@/modules/system-logs/system-logs.module";
import { SharedModule } from "@/shared/shared.module";

@Module({
  controllers: [AppController],
  imports: [
    AppConfigModule,
    DatabaseModule,
    SharedModule,
    GraphQLModule.forRoot<ApolloDriverConfig>(buildGraphqlConfig()),
    SystemLogsModule,
    IdentityModule,
    AssistantModule,
  ],
  providers: [
    AppResolver,
    // Global guards run in this order: client key → device session.
    { provide: APP_GUARD, useClass: ClientApiKeyGuard },
    { provide: APP_GUARD, useExisting: UserSessionGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
