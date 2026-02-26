import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const contentLength = Number(request.headers.get('content-length') || '0');
  const contentTypeHeader = request.headers.get('content-type') || '';
  const contentType = contentTypeHeader.split(';')[0].trim();

  if (!filename) {
    return new NextResponse("Filename is required", { status: 400 });
  }

  if (!contentLength) {
    return new NextResponse("Content-Length is required", { status: 411 });
  }

  if (contentLength > MAX_UPLOAD_BYTES) {
    return new NextResponse("File too large", { status: 413 });
  }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return new NextResponse("Unsupported file type", { status: 415 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = safeName.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return new NextResponse("Unsupported file extension", { status: 415 });
  }

  const finalFilename = `uploads/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  try {
    const blob = await put(finalFilename, request.body as ReadableStream, {
      access: 'public',
      contentType,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Upload error:", error);
    return new NextResponse("Upload failed", { status: 500 });
  }
}
