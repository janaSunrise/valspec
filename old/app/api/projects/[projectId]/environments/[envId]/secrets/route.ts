import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { resolveSecrets } from "@/lib/secrets/inheritance";
import { withAuth, parseBody, type AuthContext } from "@/lib/api/with-auth";
import { requireEnvAccess } from "@/lib/api/ownership";
import { createSecretSchema } from "@/lib/schemas";

async function getSecrets(ctx: AuthContext) {
  const { projectId, envId } = ctx.params;

  const supabase = await createServerSupabaseClient();

  // Fetch project with all environments and secrets for inheritance resolution
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, environments(*, secrets(*))")
    .eq("id", projectId)
    .eq("user_id", ctx.user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const environments = project.environments || [];
  const currentEnv = environments.find((e) => e.id === envId);
  if (!currentEnv) {
    return NextResponse.json({ error: "Environment not found" }, { status: 404 });
  }

  const allSecrets = environments.flatMap((e) => e.secrets || []);
  const resolvedSecrets = resolveSecrets(envId, environments, allSecrets);

  return NextResponse.json(resolvedSecrets);
}

async function createSecret(ctx: AuthContext) {
  const { projectId, envId } = ctx.params;

  const parsed = await parseBody(ctx.request, createSecretSchema);
  if ("error" in parsed) return parsed.error;

  const { key, value } = parsed.data;

  // Verify access and get environment with secrets
  const access = await requireEnvAccess(projectId, envId, ctx.user.id);
  if ("error" in access) return access.error;

  const supabase = await createServerSupabaseClient();

  // Check for duplicate key
  const { data: existing } = await supabase
    .from("secrets")
    .select("id")
    .eq("environment_id", envId)
    .eq("key", key)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Secret with this key already exists" }, { status: 409 });
  }

  // Encrypt and insert
  const encrypted = await encryptSecret(value);

  const { data: secret, error } = await supabase
    .from("secrets")
    .insert({
      environment_id: envId,
      key,
      ...encrypted,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert version record (fire and forget)
  supabase.from("secret_versions").insert({
    secret_id: secret.id,
    version: 1,
    ...encrypted,
    change_type: "created",
    change_source: "web",
  });

  return NextResponse.json(
    {
      id: secret.id,
      key: secret.key,
      version: secret.version,
      created_at: secret.created_at,
    },
    { status: 201 },
  );
}

export const GET = withAuth(getSecrets);
export const POST = withAuth(createSecret);
