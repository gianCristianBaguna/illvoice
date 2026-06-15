import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('adminToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    token,
    email: cookieStore.get('adminEmail')?.value || null,
    role: cookieStore.get('adminRole')?.value || 'ADMIN',
  });
}
