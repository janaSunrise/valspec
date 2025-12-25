import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { resolveSecrets } from '@/lib/secrets/inheritance';

type Params = Promise<{ projectId: string; envId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, envId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get all environments for inheritance resolution
  const { data: environments } = await supabase
    .from('environments')
    .select('*')
    .eq('project_id', projectId);

  if (!environments) {
    return NextResponse.json({ error: 'Failed to fetch environments' }, { status: 500 });
  }

  const currentEnv = environments.find((e) => e.id === envId);
  if (!currentEnv) {
    return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
  }

  // Get all secrets for all environments in the project (for inheritance)
  const envIds = environments.map((e) => e.id);
  const { data: allSecrets, error } = await supabase
    .from('secrets')
    .select('*')
    .in('environment_id', envIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve secrets with inheritance
  const resolvedSecrets = resolveSecrets(envId, environments, allSecrets || []);

  return NextResponse.json(resolvedSecrets);
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, envId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  if (!value || typeof value !== 'string') {
    return NextResponse.json({ error: 'Value is required' }, { status: 400 });
  }

  // Validate key format (uppercase letters, numbers, underscores)
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
    return NextResponse.json(
      {
        error:
          'Key must start with a letter and contain only uppercase letters, numbers, and underscores',
      },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: environment } = await supabase
    .from('environments')
    .select('id')
    .eq('id', envId)
    .eq('project_id', projectId)
    .single();

  if (!environment) {
    return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('secrets')
    .select('id')
    .eq('environment_id', envId)
    .eq('key', key)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Secret with this key already exists' }, { status: 409 });
  }

  const encrypted = await encrypt(value);

  const { data: secret, error } = await supabase
    .from('secrets')
    .insert({
      environment_id: envId,
      key,
      encrypted_value: encrypted.encryptedValue,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('secret_versions').insert({
    secret_id: secret.id,
    version: 1,
    encrypted_value: encrypted.encryptedValue,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
    change_type: 'created',
    change_source: 'web',
  });

  return NextResponse.json(
    {
      id: secret.id,
      key: secret.key,
      version: secret.version,
      created_at: secret.created_at,
    },
    { status: 201 }
  );
}
