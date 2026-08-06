import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function decodeJwtName(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const data = JSON.parse(json);
    return data.name || null;
  } catch {
    return null;
  }
}

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
    barangayId: cookieStore.get('barangayId')?.value || null,
    name: decodeJwtName(token),
    emailVerified: cookieStore.get('emailVerified')?.value === 'true',
  });
}
