import { NextResponse } from 'next/server';

export function middleware(req) {
    const token = req.cookies.get('token');
    const protectedRoutes = ['/dashboard', '/canvas'];

    if (protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route)) && !token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
}
