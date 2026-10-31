import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags
      : body.tag
      ? [String(body.tag)]
      : [
          'settings',
          'navigation',
          'hero',
          'categories',
          'homepage',
          'products',
          'footer',
          'pages',
        ];

    for (const t of tags) {
      revalidateTag(t);
    }
    revalidatePath('/', 'layout');

    return NextResponse.json({ revalidated: true, tags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Revalidation failed' },
      { status: 500 }
    );
  }
}

