import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = Promise<{ projectId: string }>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await request.json();
  const { name, color, inherits_from_id } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: 'Invalid environment name' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify project exists
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check for duplicate slug within project
  const { data: existing } = await supabase
    .from('environments')
    .select('id')
    .eq('project_id', projectId)
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Environment with this name already exists' },
      { status: 409 }
    );
  }

  // Validate inheritance (must be in same project, no cycles)
  if (inherits_from_id) {
    const { data: parentEnv } = await supabase
      .from('environments')
      .select('id, project_id')
      .eq('id', inherits_from_id)
      .single();

    if (!parentEnv || parentEnv.project_id !== projectId) {
      return NextResponse.json({ error: 'Invalid inheritance target' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('environments')
    .insert({
      name,
      slug,
      color: color || '#6366f1',
      project_id: projectId,
      inherits_from_id: inherits_from_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
