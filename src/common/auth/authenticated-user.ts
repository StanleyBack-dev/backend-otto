import type { Request } from "express";

// Who is calling, as established by the session guard (identity module) and
// read by resolvers via @CurrentUser().
export type AuthenticatedUser = {
  id: string;
  /** The device (session) the request comes from. */
  deviceId: string;
  name: string;
  email: string;
};

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
