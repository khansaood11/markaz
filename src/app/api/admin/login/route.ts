import { sealData } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const session = { isLoggedIn: true };
    const encryptedSession = await sealData(session, {
      password: process.env.SESSION_PASSWORD!,
    });

    cookies().set('session', encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // One week
      path: '/',
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
}