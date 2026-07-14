import { NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/auth/token";
import JWT from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { AuthCheckContext, AuthUser } from "@/types";
import type { UserSelect } from "../../../prisma/generated/models";

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    createdAt: true,
    updatedAt: true,
} satisfies UserSelect;

export default class Auth {
    static unauthorizedResponse(message = "Unauthorized") {
        return NextResponse.json({ success: false, message }, { status: 401 });
    }

    static isAuthContext(value: AuthCheckContext | NextResponse): value is AuthCheckContext {
        return !(value instanceof NextResponse);
    }

    static async requireAuth(request: Request): Promise<AuthCheckContext | NextResponse> {
        const token = extractBearerToken(request);

        if (!token) return this.unauthorizedResponse("Missing authorization token");

        try {
            const userId = await JWT.verify(token);
            if (!userId) return this.unauthorizedResponse("Invalid authorization token");

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: USER_SELECT,
            });

            if (!user) return this.unauthorizedResponse("User not found");

            return { user: user as AuthUser, userId, token };
        } catch {
            return this.unauthorizedResponse("Invalid or expired authorization token");
        }
    }
}
