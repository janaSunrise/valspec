import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { withAuth, parseBody, type AuthContext } from "@/lib/api/with-auth";
import { createProjectSchema } from "@/lib/schemas";

async function getProjects(ctx: AuthContext) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*, environments(count)")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function createProject(ctx: AuthContext) {
  const parsed = await parseBody(ctx.request, createProjectSchema);
  if ("error" in parsed) return parsed.error;

  const { name, description } = parsed.data;

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Check for duplicate slug
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", ctx.user.id)
    .eq("slug", slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Project with this name already exists" }, { status: 409 });
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name,
      slug,
      description: description || null,
      user_id: ctx.user.id,
    })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  // Create default development environment
  const { error: envError } = await supabase.from("environments").insert({
    name: "Development",
    slug: "development",
    color: "#22c55e",
    project_id: project.id,
  });

  if (envError) {
    // Rollback project creation
    await supabase.from("projects").delete().eq("id", project.id);
    return NextResponse.json({ error: envError.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}

export const GET = withAuth(getProjects);
export const POST = withAuth(createProject);
