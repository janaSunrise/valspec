import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { withAuth, parseBody, type AuthContext } from "@/lib/api/with-auth";
import { requireProjectWithEnvs } from "@/lib/api/ownership";
import { createEnvironmentSchema } from "@/lib/schemas";

async function getEnvironments(ctx: AuthContext) {
  const { projectId } = ctx.params;

  const result = await requireProjectWithEnvs(projectId, ctx.user.id);
  if ("error" in result) return result.error;

  // Sort by created_at ascending
  const environments = result.environments.sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
  );

  return NextResponse.json(environments);
}

async function createEnvironment(ctx: AuthContext) {
  const { projectId } = ctx.params;

  const parsed = await parseBody(ctx.request, createEnvironmentSchema);
  if ("error" in parsed) return parsed.error;

  const { name, color, inherits_from_id } = parsed.data;

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid environment name" }, { status: 400 });
  }

  // Get project with existing environments
  const result = await requireProjectWithEnvs(projectId, ctx.user.id);
  if ("error" in result) return result.error;

  // Check for duplicate slug
  const existingEnv = result.environments.find((e) => e.slug === slug);
  if (existingEnv) {
    return NextResponse.json(
      { error: "Environment with this name already exists" },
      { status: 409 },
    );
  }

  // Validate inheritance target
  if (inherits_from_id) {
    const parentExists = result.environments.some((e) => e.id === inherits_from_id);
    if (!parentExists) {
      return NextResponse.json({ error: "Invalid inheritance target" }, { status: 400 });
    }
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("environments")
    .insert({
      name,
      slug,
      color: color || "#6366f1",
      project_id: projectId,
      inherits_from_id: inherits_from_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export const GET = withAuth(getEnvironments);
export const POST = withAuth(createEnvironment);
