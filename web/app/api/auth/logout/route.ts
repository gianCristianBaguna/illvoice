import { NextResponse } from 'next/server';

const cookieOptions = {
  path: '/',
  maxAge: 0,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('adminToken', '', cookieOptions);
  response.cookies.set('adminEmail', '', cookieOptions);
  response.cookies.set('adminRole', '', cookieOptions);

  return response;
}
