import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@/common/auth/authenticated-user";
import { IS_INTERNAL_ROUTE_KEY } from "@/common/decorators/internal-route.decorator";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { requestFromContext } from "@/common/http/request-from-context";
import { SKIP_CLIENT_KEY } from "@/common/security/client-api-key.guard";
import { AuthenticateUseCase } from "@/modules/identity/application/use-cases/authenticate.use-case";

// Global guard (after the client key): every operation requires a signed-in
// device, unless @Public(), @InternalRoute() or the open health check. Sets
// request.user for the resolvers.
@Injectable()
export class UserSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticate: AuthenticateUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      [IS_PUBLIC_KEY, IS_INTERNAL_ROUTE_KEY, SKIP_CLIENT_KEY].some((key) =>
        this.reflector.getAllAndOverride<boolean>(key, targets),
      )
    ) {
      return true;
    }
    const request = requestFromContext<AuthenticatedRequest>(context);
    const [scheme, token] = (request.header("authorization") ?? "").split(" ");
    request.user = await this.authenticate.execute(
      scheme === "Bearer" && token ? token : null,
    );
    return true;
  }
}
