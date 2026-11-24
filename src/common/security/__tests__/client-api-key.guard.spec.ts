import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Reflector } from "@nestjs/core";
import { AppException } from "@/common/exceptions/app-exception";
import { IS_INTERNAL_ROUTE_KEY } from "@/common/decorators/internal-route.decorator";
import {
  ClientApiKeyGuard,
  SKIP_CLIENT_KEY,
} from "@/common/security/client-api-key.guard";

const KEY = "k".repeat(48);

function contextWith(header: string | undefined): ExecutionContext {
  const request = { header: () => header };
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(
  metadata: Record<string, boolean> = {},
  key: string = KEY,
): ClientApiKeyGuard {
  const reflector = {
    getAllAndOverride: (name: string) => metadata[name] ?? false,
  } as unknown as Reflector;
  const config = { get: () => key } as unknown as ConfigService;
  return new ClientApiKeyGuard(reflector, config);
}

describe("ClientApiKeyGuard", () => {
  it("lets a request with the right key through", () => {
    expect(guardWith().canActivate(contextWith(KEY))).toBe(true);
  });

  it("rejects a missing or wrong key", () => {
    expect(() => guardWith().canActivate(contextWith(undefined))).toThrow(
      AppException,
    );
    expect(() => guardWith().canActivate(contextWith("wrong"))).toThrow(
      AppException,
    );
  });

  it("rejects everything when the API has no key configured", () => {
    expect(() => guardWith({}, "").canActivate(contextWith(""))).toThrow(
      AppException,
    );
  });

  it("skips the check on the health check and the internal routes", () => {
    expect(
      guardWith({ [SKIP_CLIENT_KEY]: true }).canActivate(
        contextWith(undefined),
      ),
    ).toBe(true);
    expect(
      guardWith({ [IS_INTERNAL_ROUTE_KEY]: true }).canActivate(
        contextWith(undefined),
      ),
    ).toBe(true);
  });
});
