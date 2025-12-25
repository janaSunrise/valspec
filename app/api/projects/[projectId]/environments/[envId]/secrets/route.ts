import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { resolveSecrets } from '@/lib/secrets/inheritance';

type Params = Promise<{ projectId: string; envId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId, envId }] = await Promise.all([getSession(), params]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, environments(*, secrets(*))')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const environments = project.environments || [];
  const currentEnv = environments.find((e) => e.id === envId);
  if (!currentEnv) {
    return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
  }

  const allSecrets = environments.flatMap((e) => e.secrets || []);
  const resolvedSecrets = resolveSecrets(envId, environments, allSecrets);

  return NextResponse.json(resolvedSecrets);
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId, envId }] = await Promise.all([getSession(), params]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, environments!inner(id, secrets(id, key))')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .eq('environments.id', envId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project or environment not found' }, { status: 404 });
  }

  const environment = project.environments?.[0];
  if (!environment) {
    return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
  }

  const existingSecret = environment.secrets?.find((s) => s.key === key);
  if (existingSecret) {
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

  // Insert version record (fire and forget - doesn't block response)
  supabase.from('secret_versions').insert({
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
