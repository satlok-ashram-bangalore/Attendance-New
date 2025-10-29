import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle API routes first (no internationalization needed)
  if (pathname.startsWith('/api/priv')) {
    return handlePrivAPI(request)
  }

  if (pathname.startsWith('/api/admin')) {
    return handleAdminAPI(request)
  }

  // Return request for all other routes
  return NextResponse.next();
}

function decodeJWTWithoutVerify(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return payload;
  } catch (err) {
    console.error("Invalid token payload", err);
    return null;
  }
}
export async function handlePrivAPI(request: NextRequest) {

  try {
    const token = request.headers.get("Authorization");

    const user_token = token?.split("Bearer ")[1];

    if (!user_token) {
      return NextResponse.json(
        {
          message: 'User token missing',
        },
        { status: 401 }
      );
    }

    const decoded = decodeJWTWithoutVerify(token);

    if (!decoded) {
      throw new Error('[Priv Middleware] Auth state not found');
    }

    if (decoded.role === 'authenticated') {
      const response = NextResponse.next();
      response.headers.set('x-user-id', decoded.sub);

      return response;
    }

    throw new Error('[Priv Middleware] user role not matched');
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "[Priv Middleware] Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function handleAdminAPI(request: NextRequest) {

  try {
    const token = request.headers.get("Authorization");

    const user_token = token?.split("Bearer ")[1];

    if (!user_token) {
      return NextResponse.json(
        {
          message: 'User token missing',
        },
        { status: 401 }
      );
    }

    const decoded = decodeJWTWithoutVerify(token);

    if (!decoded) {
      throw new Error('[Admin Middleware] Auth state not found');
    }

    console.log(request.nextUrl.pathname)
    
    if (decoded.role === 'admin') {
      const response = NextResponse.next();
      return response;
    }

    throw new Error('[Admin Middleware] user role not matched');
  } catch (error) {

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "[Admin Middleware] Internal server error",
      },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    '/api/priv/(.*)',
    '/api/admin/(.*)',
  ]
}