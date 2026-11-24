import type { AppErrorDefinition } from "@/common/exceptions/app-error-definition.type";
import { authErrors } from "@/common/exceptions/catalogs/auth-errors.catalog";
import { identityErrors } from "@/common/exceptions/catalogs/identity-errors.catalog";

// One catalog per area (common/exceptions/catalogs). Messages are
// user-facing, so they are written in Portuguese.
export const APP_ERRORS = {
  auth: authErrors,
  identity: identityErrors,
} as const satisfies Record<string, Record<string, AppErrorDefinition<never>>>;
