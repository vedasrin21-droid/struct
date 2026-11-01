import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, generateStorageKey } from '@/lib/storage/r2';
import { getAuthContext } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    const authCtx = await getAuthContext(request);
    const body = await request.json();
    const { fileName, contentType, folder = 'temp_resumes' } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { success: false, error: 'fileName and contentType are required.' },
        { status: 400 }
      );
    }

    const ownerId = authCtx?.userId || 'guest_' + Math.random().toString(36).substring(2, 10);
    const storageKey = generateStorageKey(folder, ownerId, fileName);

    const presigned = await getPresignedUploadUrl(storageKey, contentType);

    return NextResponse.json({
      success: true,
      ...presigned,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Storage upload request failed' },
      { status: 500 }
    );
  }
}
