import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import {
  deleteImageFromCloudinary,
  uploadImageToCloudinary,
} from '@/lib/cloudinary';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return roleRow?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'adyora/general');
    const previousPublicId = String(formData.get('previousPublicId') || '');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No image file provided.' },
        { status: 400 }
      );
    }

    // Delete replaced image if provided
    if (previousPublicId) {
      await deleteImageFromCloudinary(previousPublicId).catch(() => {});
    }

    const uploaded = await uploadImageToCloudinary(file, folder);
    return NextResponse.json(uploaded);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Cloudinary upload failed.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const publicId = String(body.public_id || '');
    if (!publicId) {
      return NextResponse.json(
        { error: 'Missing public_id parameter' },
        { status: 400 }
      );
    }

    const deleted = await deleteImageFromCloudinary(publicId);
    return NextResponse.json({ deleted });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Cloudinary delete failed.',
      },
      { status: 500 }
    );
  }
}

