import { Query, Resolver } from "@nestjs/graphql";

// A schema needs at least one query. `ping` lets a client check that the
// GraphQL endpoint is up and that its client key is accepted.
@Resolver()
export class AppResolver {
  @Query(() => String, { description: "Verifica se a API GraphQL responde." })
  ping(): string {
    return "pong";
  }
}
