import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { withAuth, parseBody, type AuthContext } from '@/lib/api/with-auth';
import { requireSecretAccess } from '@/lib/api/ownership';
import { updateSecretSchema } from '@/lib/schemas';

async function getSecret(ctx: AuthContext) {
  const { projectId, envId, secretId } = ctx.params;

  const result = await requireSecretAccess(projectId, envId, secretId, ctx.user.id);
  if ('error' in result) return result.error;

  const { secret } = result;

  const decryptedValue = await decryptSecret({
    encrypted_value: secret.encrypted_value,
    iv: secret.iv,
    auth_tag: secret.auth_tag,
  });

  return NextResponse.json({
    id: secret.id,
    key: secret.key,
    value: decryptedValue,
    version: secret.version,
    created_at: secret.created_at,
    updated_at: secret.updated_at,
  });
}

async function updateSecret(ctx: AuthContext) {
  const { projectId, envId, secretId } = ctx.params;

  const parsed = await parseBody(ctx.request, updateSecretSchema);
  if ('error' in parsed) return parsed.error;

  const { value } = parsed.data;

  const result = await requireSecretAccess(projectId, envId, secretId, ctx.user.id);
  if ('error' in result) return result.error;

  const { secret: currentSecret } = result;

  const encrypted = await encryptSecret(value);
  const newVersion = currentSecret.version + 1;

  const supabase = await createServerSupabaseClient();

  // Update secret and insert version in parallel
  const [{ data: secret, error }] = await Promise.all([
    supabase
      .from('secrets')
      .update({
        ...encrypted,
        version: newVersion,
      })
      .eq('id', secretId)
      .select()
      .single(),
    supabase.from('secret_versions').insert({
      secret_id: secretId,
      version: newVersion,
      ...encrypted,
      change_type: 'updated',
      change_source: 'web',
    }),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: secret.id,
    key: secret.key,
    version: secret.version,
    updated_at: secret.updated_at,
  });
}

async function deleteSecret(ctx: AuthContext) {
  const { projectId, envId, secretId } = ctx.params;

  const result = await requireSecretAccess(projectId, envId, secretId, ctx.user.id);
  if ('error' in result) return result.error;

  const { secret } = result;

  const supabase = await createServerSupabaseClient();

  // Insert version record and delete secret in parallel
  const [, { error }] = await Promise.all([
    supabase.from('secret_versions').insert({
      secret_id: secretId,
      version: secret.version + 1,
      encrypted_value: secret.encrypted_value,
      iv: secret.iv,
      auth_tag: secret.auth_tag,
      change_type: 'deleted',
      change_source: 'web',
    }),
    supabase.from('secrets').delete().eq('id', secretId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export const GET = withAuth(getSecret);
export const PATCH = withAuth(updateSecret);
export const DELETE = withAuth(deleteSecret);
