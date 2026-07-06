import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, barangayId } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    if (!barangayId) {
      return NextResponse.json({ error: 'Barangay ID is required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://192.168.5.235:4000';
    const token = request.cookies.get('adminToken')?.value;

    const response = await fetch(`${backendUrl}/api/admin/register-barangay-official`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, password, fullName, barangayId }),
    });

    if (!response.ok) {
      let msg = 'Registration failed';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        msg = data.error || msg;
      }
      return NextResponse.json({ error: msg }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      token: data.token,
      email: data.email,
      name: data.name,
      role: data.role,
      barangayId: data.barangayId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
