import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db";
import { withAuth, type AuthContext } from "@/lib/api/with-auth";
import { requireSecretAccess } from "@/lib/api/ownership";

async function rollbackToVersion(ctx: AuthContext) {
  const { projectId, envId, secretId, versionId } = ctx.params;

  const result = await requireSecretAccess(projectId, envId, secretId, ctx.user.id);
  if ("error" in result) return result.error;

  const { secret } = result;

  const supabase = await createServerSupabaseClient();

  // Get the version to rollback to
  const { data: targetVersion, error: versionError } = await supabase
    .from("secret_versions")
    .select("*")
    .eq("id", versionId)
    .eq("secret_id", secretId)
    .single();

  if (versionError || !targetVersion) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Cannot rollback to a "deleted" version
  if (targetVersion.change_type === "deleted") {
    return NextResponse.json({ error: "Cannot rollback to a deleted version" }, { status: 400 });
  }

  const newVersion = secret.version + 1;

  // Update the secret with the old version's encrypted value and create rollback version record
  const [{ data: updatedSecret, error: updateError }] = await Promise.all([
    supabase
      .from("secrets")
      .update({
        encrypted_value: targetVersion.encrypted_value,
        iv: targetVersion.iv,
        auth_tag: targetVersion.auth_tag,
        version: newVersion,
      })
      .eq("id", secretId)
      .select()
      .single(),
    supabase.from("secret_versions").insert({
      secret_id: secretId,
      version: newVersion,
      encrypted_value: targetVersion.encrypted_value,
      iv: targetVersion.iv,
      auth_tag: targetVersion.auth_tag,
      change_type: "rollback",
      change_source: "web",
    }),
  ]);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: updatedSecret.id,
    key: updatedSecret.key,
    version: updatedSecret.version,
    rolledBackFrom: targetVersion.version,
    updatedAt: updatedSecret.updated_at,
  });
}

export const POST = withAuth(rollbackToVersion);
