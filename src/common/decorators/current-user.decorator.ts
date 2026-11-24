import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from "@/common/auth/authenticated-user";
import { requestFromContext } from "@/common/http/request-from-context";

// The caller set by the session guard. Only valid on non-public operations.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = requestFromContext<AuthenticatedRequest>(context).user;
    if (!user) throw new Error("CurrentUser used on a public operation.");
    return user;
  },
);
