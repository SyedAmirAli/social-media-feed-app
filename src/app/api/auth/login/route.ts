import { NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/auth/cookie";
import Hash from "@/lib/hash";
import JWT from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { loginUserSchema } from "@/lib/validations/login";
import type { AuthUser } from "@/types";

/** Session (no remember): 1 day. Remember me: 30 days. */
const SESSION_MAX_AGE = 60 * 60 * 24;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = loginUserSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Validation failed",
                    errors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const { email, password, remember } = parsed.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email or password",
                },
                { status: 401 },
            );
        }

        const isValidPassword = await Hash.check({
            password,
            hash: existingUser.password,
        });

        if (!isValidPassword) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid email or password",
                },
                { status: 401 },
            );
        }

        const maxAge = remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
        const tokenExpiration = remember ? "30d" : "1d";
        const token = await JWT.sign(existingUser.id, tokenExpiration);

        const user: AuthUser = {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            avatar: existingUser.avatar,
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
        };

        const response = NextResponse.json(
            {
                success: true,
                message: "Login successful",
                token,
                user,
            },
            { status: 200 },
        );

        response.cookies.set(
            "Authorization",
            `Bearer ${token}`,
            authCookieOptions(request, { maxAge }),
        );

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while logging in",
            },
            { status: 500 },
        );
    }
}
