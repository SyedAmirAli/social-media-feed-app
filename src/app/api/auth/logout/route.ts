import { NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/auth/cookie";

export async function POST(request: Request) {
    const response = NextResponse.json({
        success: true,
        message: "Logged out successfully",
    });

    response.cookies.set(
        "Authorization",
        "",
        authCookieOptions(request, { maxAge: 0 }),
    );

    return response;
}
