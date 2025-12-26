import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";

// User type based on Better Auth session
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContext {
  user: AuthUser;
  request: NextRequest;
  params: Record<string, string>;
}

export type AuthHandler = (ctx: AuthContext) => Promise<NextResponse>;

// Higher-order function that wraps route handlers with authentication.
// Automatically checks for a valid session and passes the user to the handler.
export function withAuth(handler: AuthHandler) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;

    return handler({
      user: session.user as AuthUser,
      request,
      params: resolvedParams,
    });
  };
}

// Helper for parsing and validating JSON request body with Zod schema.
// Returns either the validated data or an error response.
export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues[0]?.message || "Validation failed";
    return {
      error: NextResponse.json({ error: message }, { status: 400 }),
    };
  }

  return { data: result.data };
}
