import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap/configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);

  const port = app.get(ConfigService).get<number>("PORT") || 4100;
  await app.listen(port);
  console.log(
    `\nOtto API rodando em http://localhost:${port} (GraphQL em /graphql)`,
  );
}

void bootstrap();
