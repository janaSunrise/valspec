import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { withAuth, parseBody, type AuthContext } from "@/lib/api/with-auth";
import { requireEnvAccess } from "@/lib/api/ownership";
import { updateEnvironmentSchema } from "@/lib/schemas";

async function getEnvironment(ctx: AuthContext) {
  const { projectId, envId } = ctx.params;

  const result = await requireEnvAccess(projectId, envId, ctx.user.id);
  if ("error" in result) return result.error;

  return NextResponse.json(result.environment);
}

async function updateEnvironment(ctx: AuthContext) {
  const { projectId, envId } = ctx.params;

  const parsed = await parseBody(ctx.request, updateEnvironmentSchema);
  if ("error" in parsed) return parsed.error;

  const { name, color, inherits_from_id } = parsed.data;

  // Verify access
  const access = await requireEnvAccess(projectId, envId, ctx.user.id);
  if ("error" in access) return access.error;

  const supabase = await createServerSupabaseClient();

  const updates: {
    name?: string;
    slug?: string;
    color?: string;
    inherits_from_id?: string | null;
  } = {};

  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("environments")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", updates.slug)
      .neq("id", envId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Environment with this name already exists" },
        { status: 409 },
      );
    }
  }

  if (color !== undefined) {
    updates.color = color;
  }

  if (inherits_from_id !== undefined) {
    if (inherits_from_id === null) {
      updates.inherits_from_id = null;
    } else {
      // Validate inheritance
      if (inherits_from_id === envId) {
        return NextResponse.json(
          { error: "Environment cannot inherit from itself" },
          { status: 400 },
        );
      }

      const { data: parentEnv } = await supabase
        .from("environments")
        .select("id, project_id, inherits_from_id")
        .eq("id", inherits_from_id)
        .single();

      if (!parentEnv || parentEnv.project_id !== projectId) {
        return NextResponse.json({ error: "Invalid inheritance target" }, { status: 400 });
      }

      // Check for circular inheritance (max depth 10)
      let checkId: string | null = inherits_from_id;
      for (let depth = 0; checkId && depth < 10; depth++) {
        if (checkId === envId) {
          return NextResponse.json({ error: "Circular inheritance detected" }, { status: 400 });
        }
        const checkResult: { data: { inherits_from_id: string | null } | null } = await supabase
          .from("environments")
          .select("inherits_from_id")
          .eq("id", checkId)
          .single();
        checkId = checkResult.data?.inherits_from_id ?? null;
      }

      updates.inherits_from_id = inherits_from_id;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("environments")
    .update(updates)
    .eq("id", envId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function deleteEnvironment(ctx: AuthContext) {
  const { projectId, envId } = ctx.params;

  // Verify access
  const access = await requireEnvAccess(projectId, envId, ctx.user.id);
  if ("error" in access) return access.error;

  const supabase = await createServerSupabaseClient();

  // Check if other environments inherit from this one
  const { data: dependents } = await supabase
    .from("environments")
    .select("id, name")
    .eq("inherits_from_id", envId);

  if (dependents && dependents.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${dependents.map((e) => e.name).join(", ")} inherit from this environment`,
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("environments").delete().eq("id", envId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export const GET = withAuth(getEnvironment);
export const PATCH = withAuth(updateEnvironment);
export const DELETE = withAuth(deleteEnvironment);
