import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

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

  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
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

  const { projectId, envId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, color, inherits_from_id } = body;

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

  const updates: {
    name?: string;
    slug?: string;
    color?: string;
    inherits_from_id?: string | null;
  } = {};

  if (name !== undefined) {
    updates.name = name;
    updates.slug = slugify(name);

    const { data: existing } = await supabase
      .from('environments')
      .select('id')
      .eq('project_id', projectId)
      .eq('slug', updates.slug)
      .neq('id', envId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Environment with this name already exists' },
        { status: 409 }
      );
    }
  }

  if (color !== undefined) {
    updates.color = color;
  }

  if (inherits_from_id !== undefined) {
    if (inherits_from_id === null) {
      updates.inherits_from_id = null;
    } else {
      // Validate inheritance
      if (inherits_from_id === envId) {
        return NextResponse.json(
          { error: 'Environment cannot inherit from itself' },
          { status: 400 }
        );
      }

      const { data: parentEnv } = await supabase
        .from('environments')
        .select('id, project_id, inherits_from_id')
        .eq('id', inherits_from_id)
        .single();

      if (!parentEnv || parentEnv.project_id !== projectId) {
        return NextResponse.json({ error: 'Invalid inheritance target' }, { status: 400 });
      }

      // Check for circular inheritance (max depth 10)
      let currentId: string | null = inherits_from_id;
      let depth = 0;
      while (currentId && depth < 10) {
        if (currentId === envId) {
          return NextResponse.json({ error: 'Circular inheritance detected' }, { status: 400 });
        }
        const { data: env } = await supabase
          .from('environments')
          .select('inherits_from_id')
          .eq('id', currentId)
          .single();
        currentId = env?.inherits_from_id || null;
        depth++;
      }

      updates.inherits_from_id = inherits_from_id;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('environments')
    .update(updates)
    .eq('id', envId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
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

  // Check if other environments inherit from this one
  const { data: dependents } = await supabase
    .from('environments')
    .select('id, name')
    .eq('inherits_from_id', envId);

  if (dependents && dependents.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${dependents.map((e) => e.name).join(', ')} inherit from this environment`,
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('environments')
    .delete()
    .eq('id', envId)
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
