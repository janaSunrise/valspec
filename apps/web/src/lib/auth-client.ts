import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "better-auth/client/plugins";

import { env } from "@valspec/env/web";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [apiKeyClient()],
});
