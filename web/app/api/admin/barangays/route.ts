import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://192.168.5.235:4000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/barangays`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error || 'Failed to fetch barangays' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch barangays' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, latitude, longitude } = await request.json();

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, latitude, and longitude are required' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/barangays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, latitude, longitude }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error || 'Failed to create barangay' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create barangay' }, { status: 500 });
  }
}