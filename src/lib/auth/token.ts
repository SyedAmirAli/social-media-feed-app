import { NextRequest } from "next/server";
import JWT from "@/lib/jwt";

/** Read Bearer token from Authorization header or Authorization cookie. */
export function extractBearerToken(request: Request): string | null {
    const header = request.headers.get("authorization") ?? request.headers.get("Authorization");

    if (header?.startsWith("Bearer ")) {
        const token = header.slice(7).trim();
        return token || null;
    }

    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const match = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("Authorization="));

    if (!match) return null;

    const raw = decodeURIComponent(match.slice("Authorization=".length));
    if (raw.startsWith("Bearer ")) {
        const token = raw.slice(7).trim();
        return token || null;
    }

    return raw.trim() || null;
}

/** Optimistic token presence check for edge proxy / page protection. */
export function hasAuthCookie(request: NextRequest): boolean {
    const value = request.cookies.get("Authorization")?.value;
    return Boolean(value && value.trim().length > 0);
}

/** Verify JWT on the edge; returns user id (subject) or null. */
export async function verifyAuthToken(request: NextRequest): Promise<string | null> {
    const cookieValue = request.cookies.get("Authorization")?.value;
    const header = request.headers.get("authorization");

    let token: string | null = null;

    if (header?.startsWith("Bearer ")) {
        token = header.slice(7).trim();
    } else if (cookieValue?.startsWith("Bearer ")) {
        token = cookieValue.slice(7).trim();
    } else if (cookieValue) {
        token = cookieValue.trim();
    }

    if (!token) return null;

    try {
        return await JWT.verify(token);
    } catch {
        return null;
    }
}
