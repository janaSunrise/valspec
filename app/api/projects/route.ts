import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*, environments(count)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: 'Invalid project name' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Project with this name already exists' }, { status: 409 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      slug,
      description: description || null,
      user_id: session.user.id,
    })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  // Create default development environment
  const { error: envError } = await supabase.from('environments').insert({
    name: 'Development',
    slug: 'development',
    color: '#22c55e',
    project_id: project.id,
  });

  if (envError) {
    await supabase.from('projects').delete().eq('id', project.id);
    return NextResponse.json({ error: envError.message }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
