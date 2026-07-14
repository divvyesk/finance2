import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getData } from '../../../lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { authenticated: false },
        { 
          status: 401,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    const data = await getData();
    const user = data.users.find(u => u.id === sessionId);

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { 
          status: 401,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: { id: user.id, name: user.name, email: user.email }
      },
      {
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
