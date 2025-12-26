import { createAuthClient } from "better-auth/react";

import { env } from "@valspec/env/web";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
});
