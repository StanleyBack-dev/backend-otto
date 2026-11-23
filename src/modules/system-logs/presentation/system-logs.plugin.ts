import { Plugin } from "@nestjs/apollo";
import { HttpException } from "@nestjs/common";
import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from "@apollo/server";
import { GraphQLError } from "graphql";
import { redact } from "@/common/logging/redact";
import {
  reportSystemEvent,
  type SystemEvent,
} from "@/common/logging/system-events";

// Puts the GraphQL failures worth knowing in the system log: unexpected
// errors (code and database), permission denials and throttled requests.
// Ordinary business errors (invalid data, not found) are left out.
@Plugin()
export class SystemLogsPlugin implements ApolloServerPlugin {
  requestDidStart(): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    const startedAt = Date.now();
    return Promise.resolve({
      didEncounterErrors: (
        ctx: GraphQLRequestContext<Record<string, unknown>>,
      ) => {
        const base = {
          source: `GraphQL ${ctx.operationName ?? "(unnamed)"}`,
          durationMs: Date.now() - startedAt,
        };
        for (const error of ctx.errors ?? []) {
          const event = classifyGraphqlError(error, base);
          if (event) reportSystemEvent(event);
        }
        return Promise.resolve();
      },
    });
  }
}

export function classifyGraphqlError(
  error: GraphQLError,
  base: Pick<SystemEvent, "source" | "durationMs">,
): SystemEvent | null {
  const original = error.originalError;
  const path = error.path?.join(".") ?? null;
  if (original instanceof HttpException) {
    const status = original.getStatus();
    const response = original.getResponse();
    const code =
      typeof response === "object" && response && "code" in response
        ? String((response as { code: unknown }).code)
        : `HTTP_${status}`;
    if (status >= 500) {
      return {
        ...base,
        level: "ERROR",
        category: "API",
        message: `${code}: ${original.message}`,
        statusCode: status,
        details: { code, path },
      };
    }
    if (status === 401 || status === 403 || status === 429) {
      return {
        ...base,
        level: "WARN",
        category: "SECURITY",
        message: `Request refused (${code})`,
        statusCode: status,
        details: { code, path },
      };
    }
    return null;
  }
  // GraphQL's own errors (syntax, unknown field) are the client's.
  if (!original || original instanceof GraphQLError) return null;
  const database = /QueryFailed|Typeorm|EntityNotFound|ECONN|ETIMEDOUT/i.test(
    `${original.name} ${original.constructor?.name ?? ""} ${original.message}`,
  );
  return {
    ...base,
    level: "ERROR",
    category: database ? "DATABASE" : "API",
    message: original.message || original.name,
    statusCode: 500,
    details: {
      path,
      error: original.name,
      stack: redact(original.stack ?? "").slice(0, 2000),
    },
  };
}
