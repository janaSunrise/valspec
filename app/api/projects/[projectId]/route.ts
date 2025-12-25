import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

type Params = Promise<{ projectId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*, environments(*)')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;

  const supabase = await createServerSupabaseClient();

  const updates: { name?: string; slug?: string; description?: string | null } = {};

  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);

    // Check if new slug conflicts with existing project for this user
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('slug', updates.slug)
      .neq('id', projectId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Project with this name already exists' }, { status: 409 });
    }
  }

  if (description !== undefined) {
    updates.description = description || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
