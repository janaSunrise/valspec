import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';

type Params = Promise<{ projectId: string; envId: string; secretId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, envId, secretId } = await params;
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

  const { data: secret, error } = await supabase
    .from('secrets')
    .select('*')
    .eq('id', secretId)
    .eq('environment_id', envId)
    .single();

  if (error || !secret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  const decryptedValue = await decrypt({
    encryptedValue: secret.encrypted_value,
    iv: secret.iv,
    authTag: secret.auth_tag,
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

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, envId, secretId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { value } = body;

  if (!value || typeof value !== 'string') {
    return NextResponse.json({ error: 'Value is required' }, { status: 400 });
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

  const { data: currentSecret } = await supabase
    .from('secrets')
    .select('*')
    .eq('id', secretId)
    .eq('environment_id', envId)
    .single();

  if (!currentSecret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  const encrypted = await encrypt(value);
  const newVersion = currentSecret.version + 1;

  const { data: secret, error } = await supabase
    .from('secrets')
    .update({
      encrypted_value: encrypted.encryptedValue,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      version: newVersion,
    })
    .eq('id', secretId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('secret_versions').insert({
    secret_id: secretId,
    version: newVersion,
    encrypted_value: encrypted.encryptedValue,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
    change_type: 'updated',
    change_source: 'web',
  });

  return NextResponse.json({
    id: secret.id,
    key: secret.key,
    version: secret.version,
    updated_at: secret.updated_at,
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, envId, secretId } = await params;
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

  const { data: secret } = await supabase
    .from('secrets')
    .select('*')
    .eq('id', secretId)
    .eq('environment_id', envId)
    .single();

  if (!secret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  // Create a "deleted" version record before deleting
  await supabase.from('secret_versions').insert({
    secret_id: secretId,
    version: secret.version + 1,
    encrypted_value: secret.encrypted_value,
    iv: secret.iv,
    auth_tag: secret.auth_tag,
    change_type: 'deleted',
    change_source: 'web',
  });

  const { error } = await supabase.from('secrets').delete().eq('id', secretId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
