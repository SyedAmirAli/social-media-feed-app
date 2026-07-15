import { NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/auth/cookie";
import Hash from "@/lib/hash";
import JWT from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { registerUserSchema } from "@/lib/validations/register";

/** Session (no remember): 1 day. Remember me: 30 days. */
const SESSION_MAX_AGE = 60 * 60 * 24;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = registerUserSchema.safeParse(body);

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

        const { email, password, confirmPassword, remember } = parsed.data;
        const name = parsed.data.name?.trim() || email.split("@")[0] || "User";

        if (password !== confirmPassword) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Passwords do not match",
                    errors: { confirmPassword: ["Passwords do not match"] },
                },
                { status: 400 },
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email is already registered",
                    errors: { email: ["Email is already registered"] },
                },
                { status: 409 },
            );
        }

        const hashedPassword = await Hash.create(password);
        const maxAge = remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
        const tokenExpiration = remember ? "30d" : "1d";

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const token = await JWT.sign(user.id, tokenExpiration);

        const response = NextResponse.json(
            {
                success: true,
                message: "Registration successful",
                token,
                user,
            },
            { status: 201 },
        );

        response.cookies.set(
            "Authorization",
            `Bearer ${token}`,
            authCookieOptions(request, { maxAge }),
        );

        return response;
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while registering",
            },
            { status: 500 },
        );
    }
}
