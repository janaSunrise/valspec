import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { withAuth, parseBody, type AuthContext } from "@/lib/api/with-auth";
import { requireProjectAccess, requireProjectWithEnvs } from "@/lib/api/ownership";
import { updateProjectSchema } from "@/lib/schemas";

async function getProject(ctx: AuthContext) {
  const { projectId } = ctx.params;

  const result = await requireProjectWithEnvs(projectId, ctx.user.id);
  if ("error" in result) return result.error;

  return NextResponse.json({
    ...result.project,
    environments: result.environments,
  });
}

async function updateProject(ctx: AuthContext) {
  const { projectId } = ctx.params;

  const parsed = await parseBody(ctx.request, updateProjectSchema);
  if ("error" in parsed) return parsed.error;

  const { name, description } = parsed.data;

  // Check project exists and user owns it
  const access = await requireProjectAccess(projectId, ctx.user.id);
  if ("error" in access) return access.error;

  const supabase = await createServerSupabaseClient();
  const updates: { name?: string; slug?: string; description?: string | null } = {};

  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);

    // Check if new slug conflicts with existing project
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("slug", updates.slug)
      .neq("id", projectId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Project with this name already exists" }, { status: 409 });
    }
  }

  if (description !== undefined) {
    updates.description = description || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function deleteProject(ctx: AuthContext) {
  const { projectId } = ctx.params;

  const access = await requireProjectAccess(projectId, ctx.user.id);
  if ("error" in access) return access.error;

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export const GET = withAuth(getProject);
export const PATCH = withAuth(updateProject);
export const DELETE = withAuth(deleteProject);
