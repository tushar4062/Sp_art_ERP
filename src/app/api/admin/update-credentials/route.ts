import { NextRequest, NextResponse } from 'next/server';
import { updateCredentialById } from '@/app/api/credentials/[id]/route';
import { requireAdminFromRequest } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminFromRequest(request);
  if (!adminCheck.ok) return adminCheck.response;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Credential id is required' }, { status: 400 });
    }

    return updateCredentialById(id, body);
  } catch (error) {
    console.error('Error updating credential through admin endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
