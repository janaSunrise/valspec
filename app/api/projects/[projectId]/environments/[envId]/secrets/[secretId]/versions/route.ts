import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { withAuth, type AuthContext } from '@/lib/api/with-auth';
import { requireSecretAccess } from '@/lib/api/ownership';

async function getVersions(ctx: AuthContext) {
  const { projectId, envId, secretId } = ctx.params;

  const result = await requireSecretAccess(projectId, envId, secretId, ctx.user.id);
  if ('error' in result) return result.error;

  const { secret } = result;

  const supabase = await createServerSupabaseClient();

  // Fetch all versions for this secret
  const { data: versions, error } = await supabase
    .from('secret_versions')
    .select('*')
    .eq('secret_id', secretId)
    .order('version', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    secret: {
      id: secret.id,
      key: secret.key,
      currentVersion: secret.version,
    },
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      changeType: v.change_type,
      changeSource: v.change_source,
      createdAt: v.created_at,
    })),
  });
}

export const GET = withAuth(getVersions);
