import { Elysia } from "elysia";

import { auth } from "@valspec/auth";

export const sessionAuth = new Elysia({ name: "session-auth" }).derive(
  { as: "scoped" },
  async ({ request, status }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw status(401, { code: "UNAUTHORIZED", message: "Authentication required" });
    }
    return { session };
  },
);

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
