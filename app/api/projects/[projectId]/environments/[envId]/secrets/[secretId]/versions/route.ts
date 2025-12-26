import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = Promise<{ projectId: string; envId: string; secretId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId, envId, secretId }] = await Promise.all([getSession(), params]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify ownership and get secret with versions
  const { data: secret, error } = await supabase
    .from('secrets')
    .select(
      `
      id,
      key,
      version,
      environments!inner(
        id,
        name,
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

  if (error || !secret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  // Fetch all versions for this secret
  const { data: versions, error: versionsError } = await supabase
    .from('secret_versions')
    .select('*')
    .eq('secret_id', secretId)
    .order('version', { ascending: false });

  if (versionsError) {
    return NextResponse.json({ error: versionsError.message }, { status: 500 });
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
