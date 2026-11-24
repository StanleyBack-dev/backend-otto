import { buildSchema, parse, validate } from "graphql";
import { aliasLimitRule } from "@/common/graphql/alias-limit.rule";
import { depthLimitRule } from "@/common/graphql/depth-limit.rule";

const schema = buildSchema(`
  type Node { name: String, child: Node }
  type Query { ping: String, node: Node }
`);

function errorsFor(query: string): string[] {
  return validate(schema, parse(query), [
    depthLimitRule(3),
    aliasLimitRule(2),
  ]).map((error) => String(error.extensions.code));
}

describe("GraphQL query limits", () => {
  it("accepts a shallow query with few aliases", () => {
    expect(errorsFor("{ a: ping b: ping node { name } }")).toEqual([]);
  });

  it("rejects a query deeper than the limit, also through fragments", () => {
    expect(
      errorsFor("{ node { child { child { child { name } } } } }"),
    ).toEqual(["GRAPHQL_DEPTH_LIMIT"]);
    expect(
      errorsFor(
        "fragment F on Node { child { child { name } } } { node { child { ...F } } }",
      ),
    ).toEqual(["GRAPHQL_DEPTH_LIMIT"]);
  });

  it("rejects too many aliases once", () => {
    expect(errorsFor("{ a: ping b: ping c: ping d: ping }")).toEqual([
      "GRAPHQL_ALIAS_LIMIT",
    ]);
  });
});
