import { SetMetadata } from "@nestjs/common";

// Operations that work without a user session (login, refresh, ping). The
// client key is still required.
export const IS_PUBLIC_KEY = "isPublic";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
