import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = Promise<{
  projectId: string;
  envId: string;
  secretId: string;
  versionId: string;
}>;

// POST to rollback to a specific version
export async function POST(_request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId, envId, secretId, versionId }] = await Promise.all([
    getSession(),
    params,
  ]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify ownership and get current secret
  const { data: secret, error: secretError } = await supabase
    .from('secrets')
    .select(
      `
      id,
      key,
      version,
      environments!inner(
        id,
        project_id,
        projects!inner(user_id)
      )
    `
    )
    .eq('id', secretId)
    .eq('environment_id', envId)
    .eq('environments.project_id', projectId)
    .eq('environments.projects.user_id', session.user.id)
    .single();

  if (secretError || !secret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  // Get the version to rollback to
  const { data: targetVersion, error: versionError } = await supabase
    .from('secret_versions')
    .select('*')
    .eq('id', versionId)
    .eq('secret_id', secretId)
    .single();

  if (versionError || !targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Cannot rollback to a "deleted" version
  if (targetVersion.change_type === 'deleted') {
    return NextResponse.json({ error: 'Cannot rollback to a deleted version' }, { status: 400 });
  }

  const newVersion = secret.version + 1;

  // Update the secret with the old version's encrypted value and create rollback version record
  const [{ data: updatedSecret, error: updateError }] = await Promise.all([
    supabase
      .from('secrets')
      .update({
        encrypted_value: targetVersion.encrypted_value,
        iv: targetVersion.iv,
        auth_tag: targetVersion.auth_tag,
        version: newVersion,
      })
      .eq('id', secretId)
      .select()
      .single(),
    supabase.from('secret_versions').insert({
      secret_id: secretId,
      version: newVersion,
      encrypted_value: targetVersion.encrypted_value,
      iv: targetVersion.iv,
      auth_tag: targetVersion.auth_tag,
      change_type: 'rollback',
      change_source: 'web',
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
