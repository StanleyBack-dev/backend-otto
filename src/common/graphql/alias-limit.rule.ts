import { GraphQLError, type ASTVisitor, type ValidationContext } from "graphql";

// Rejects documents with too many aliases: `a1: ask(...) a2: ask(...)` would
// run the same field hundreds of times in one request (and spend the AI
// quota), beyond what the depth limit sees.
export function aliasLimitRule(maxAliases: number) {
  return (context: ValidationContext): ASTVisitor => {
    let aliases = 0;
    let reported = false;
    return {
      Field(node) {
        if (!node.alias || reported) return;
        aliases += 1;
        if (aliases > maxAliases) {
          reported = true;
          context.reportError(
            new GraphQLError(
              `A consulta usa aliases demais (máximo ${maxAliases}).`,
              { nodes: [node], extensions: { code: "GRAPHQL_ALIAS_LIMIT" } },
            ),
          );
        }
      },
    };
  };
}
