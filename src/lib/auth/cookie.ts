type AuthCookieOverrides = {
    maxAge?: number;
    expires?: Date;
};

/**
 * Detect HTTPS for the current request (direct URL or reverse-proxy headers).
 * Used so auth cookies work on both http:// and https://.
 */
export function isHttpsRequest(request: Request): boolean {
    if (request.url.startsWith("https://")) return true;

    const forwarded = request.headers.get("x-forwarded-proto");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
    }

    return false;
}

/** Shared Authorization cookie flags — `secure` follows the request protocol. */
export function authCookieOptions(request: Request, overrides: AuthCookieOverrides = {}) {
    return {
        httpOnly: true as const,
        /** true on HTTPS, false on HTTP — cookie works for both */
        secure: isHttpsRequest(request),
        sameSite: "lax" as const,
        path: "/",
        ...overrides,
    };
}
