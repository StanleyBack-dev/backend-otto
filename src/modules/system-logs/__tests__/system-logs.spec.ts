import { HttpException, HttpStatus } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { GraphQLError } from "graphql";
import type { SystemLogRepositoryPort } from "@/modules/system-logs/application/ports/system-log-repository.port";
import { SystemLogsService } from "@/modules/system-logs/application/system-logs.service";
import { clip } from "@/modules/system-logs/domain/system-log";
import { classifyGraphqlError } from "@/modules/system-logs/presentation/system-logs.plugin";

const config = { get: () => "test" } as unknown as ConfigService;

function repository(): jest.Mocked<SystemLogRepositoryPort> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    purgeBefore: jest.fn().mockResolvedValue(3),
  };
}

describe("SystemLogsService", () => {
  it("stores the event with secrets masked and texts clipped", async () => {
    const logs = repository();
    const service = new SystemLogsService(logs, config);
    await service.record({
      level: "ERROR",
      category: "API",
      source: "x".repeat(300),
      message: "failed for someone@example.com",
      details: { token: "Bearer abc.def.ghi" },
      durationMs: 12.6,
    });
    const stored = logs.insert.mock.calls[0][0];
    expect(stored.source).toHaveLength(200);
    expect(stored.message).not.toContain("someone@example.com");
    expect(JSON.stringify(stored.details)).not.toContain("abc.def.ghi");
    expect(stored.durationMs).toBe(13);
    expect(stored.environment).toBe("test");
  });

  it("never throws when the database fails", async () => {
    const logs = repository();
    logs.insert.mockRejectedValue(new Error("ECONNREFUSED"));
    const service = new SystemLogsService(logs, config);
    await expect(
      service.record({
        level: "WARN",
        category: "SYSTEM",
        source: "test",
        message: "m",
      }),
    ).resolves.toBeUndefined();
  });

  it("purges the logs older than the retention", async () => {
    const logs = repository();
    const service = new SystemLogsService(logs, config);
    const now = new Date("2026-11-23T12:00:00Z");
    await expect(service.purgeOld(now)).resolves.toBe(3);
    expect(logs.purgeBefore).toHaveBeenCalledWith(
      new Date("2026-08-25T12:00:00Z"),
    );
  });
});

describe("classifyGraphqlError", () => {
  const base = { source: "GraphQL op", durationMs: 1 };
  const wrap = (original: Error) =>
    new GraphQLError(original.message, { originalError: original });

  it("logs server errors and refused requests, ignores client errors", () => {
    expect(
      classifyGraphqlError(wrap(new HttpException("x", 500)), base)?.level,
    ).toBe("ERROR");
    expect(
      classifyGraphqlError(
        wrap(new HttpException("x", HttpStatus.UNAUTHORIZED)),
        base,
      )?.category,
    ).toBe("SECURITY");
    expect(
      classifyGraphqlError(wrap(new HttpException("x", 400)), base),
    ).toBeNull();
    expect(classifyGraphqlError(new GraphQLError("syntax"), base)).toBeNull();
  });

  it("tells database failures from code failures", () => {
    expect(
      classifyGraphqlError(wrap(new Error("connect ECONNREFUSED")), base)
        ?.category,
    ).toBe("DATABASE");
    expect(
      classifyGraphqlError(wrap(new TypeError("boom")), base)?.category,
    ).toBe("API");
  });
});

describe("clip", () => {
  it("keeps short texts and cuts long ones with an ellipsis", () => {
    expect(clip("abc", 5)).toBe("abc");
    expect(clip("abcdef", 4)).toBe("abc…");
  });
});
