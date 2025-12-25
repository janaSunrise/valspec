import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

type Params = Promise<{ projectId: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId }] = await Promise.all([getSession(), params]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, environments(*)')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const environments = (project.environments || []).sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  return NextResponse.json(environments);
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const [session, { projectId }] = await Promise.all([getSession(), params]);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, color, inherits_from_id } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: 'Invalid environment name' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, environments(id, slug)')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const existingEnv = project.environments?.find((e) => e.slug === slug);
  if (existingEnv) {
    return NextResponse.json(
      { error: 'Environment with this name already exists' },
      { status: 409 }
    );
  }

  if (inherits_from_id) {
    const parentExists = project.environments?.some((e) => e.id === inherits_from_id);
    if (!parentExists) {
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
