import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://illvoice-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('adminToken')?.value;
    console.log('[NextSendCode] Token present:', !!token);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.text();
    console.log('[NextSendCode] Forwarding to backend, body length:', body.length);
    const response = await fetch(`${BACKEND_URL}/api/auth/verify-email/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body,
    });

    console.log('[NextSendCode] Backend response status:', response.status);
    const data = await response.json();
    console.log('[NextSendCode] Backend response data:', JSON.stringify(data));
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error('[NextSendCode] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send verification code' }, { status: 500 });
  }
}
