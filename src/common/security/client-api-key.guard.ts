import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import { IS_INTERNAL_ROUTE_KEY } from "@/common/decorators/internal-route.decorator";
import { requestFromContext } from "@/common/http/request-from-context";
import { safeCompare } from "@/common/security/safe-compare";

export const CLIENT_API_KEY_HEADER = "x-client-api-key";
export const SKIP_CLIENT_KEY = "skipClientKey";

// First line of defense: only Otto's own clients (the desktop app) know
// CLIENT_API_KEY, so the API (REST and GraphQL) is closed to the public
// internet even before the session check. The scheduled routines use
// CRON_SECRET instead (@InternalRoute), and the health check is open.
@Injectable()
export class ClientApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(
        IS_INTERNAL_ROUTE_KEY,
        targets,
      ) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_CLIENT_KEY, targets)
    ) {
      return true;
    }

    const received =
      requestFromContext(context).header(CLIENT_API_KEY_HEADER) ?? "";
    const expected = this.config.get<string>("CLIENT_API_KEY") ?? "";
    if (expected && safeCompare(received, expected)) return true;

    throw AppException.from(APP_ERRORS.auth.invalidClientKey, undefined);
  }
}
