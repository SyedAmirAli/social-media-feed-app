import { NextRequest, NextResponse } from "next/server";
import { hasAuthCookie, verifyAuthToken } from "@/lib/auth/token";

const AUTH_PATHS = ["/auth/login", "/auth/registration"];

function isAuthPath(pathname: string) {
    return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Next.js 16 Proxy (formerly middleware).
 * Protects the feed and redirects guests/logged-in users appropriately.
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuthRoute = isAuthPath(pathname);
    const isFeed = pathname === "/";

    const cookiePresent = hasAuthCookie(request);
    const userId = cookiePresent ? await verifyAuthToken(request) : null;
    const isAuthenticated = Boolean(userId);

    if (isFeed && !isAuthenticated) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/auth/login", "/auth/registration", "/auth/signin", "/auth/signup"],
};
