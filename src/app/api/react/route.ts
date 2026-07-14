import { NextResponse } from "next/server";
import Auth from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { deleteReactSchema, updateReactSchema, upsertReactSchema } from "@/lib/validations/react";
import { PostStatus, React as ReactKind } from "@/types/enums";
import type { ReactType as PrismaReactType } from "../../../../prisma/generated/enums";
import type { UserSelect } from "../../../../prisma/generated/models";

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    avatar: true,
} satisfies UserSelect;

const REACT_INCLUDE = {
    user: { select: USER_SELECT },
} as const;

function toPrismaReactType(type: ReactKind | string): PrismaReactType {
    return type as PrismaReactType;
}

async function canAccessPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true, authorId: true },
    });

    if (!post) return { ok: false as const, reason: "not_found" as const };
    if (post.status === PostStatus.PRIVATE && post.authorId !== userId) {
        return { ok: false as const, reason: "forbidden" as const };
    }
    return { ok: true as const, post };
}

async function resolveTargetAccess(params: {
    postId?: string | null;
    commentId?: string | null;
    userId: string;
}) {
    if (params.postId) {
        return canAccessPost(params.postId, params.userId);
    }

    if (params.commentId) {
        const comment = await prisma.comment.findUnique({
            where: { id: params.commentId },
            select: { id: true, postId: true },
        });
        if (!comment) return { ok: false as const, reason: "not_found" as const };
        return canAccessPost(comment.postId, params.userId);
    }

    return { ok: false as const, reason: "not_found" as const };
}

/**
 * List who reacted — `?postId=` or `?commentId=`.
 * Only active reacts. Optional `?all=true` includes inactive.
 */
export async function GET(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get("postId");
        const commentId = searchParams.get("commentId");
        const includeInactive = searchParams.get("all") === "true";
        const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);
        const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

        if (Boolean(postId) === Boolean(commentId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Provide either postId or commentId",
                    errors: { target: ["Provide either postId or commentId"] },
                },
                { status: 400 },
            );
        }

        const access = await resolveTargetAccess({ postId, commentId, userId: auth.userId });
        if (!access.ok) {
            const status = access.reason === "not_found" ? 404 : 403;
            const message =
                access.reason === "not_found" ? "Target not found" : "You cannot view reactions on this content";
            return NextResponse.json({ success: false, message }, { status });
        }

        const where = {
            ...(postId ? { postId } : { commentId: commentId! }),
            ...(includeInactive ? {} : { isActive: true }),
        };

        const [reacts, total] = await Promise.all([
            prisma.react.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { createdAt: "desc" },
                include: REACT_INCLUDE,
            }),
            prisma.react.count({ where }),
        ]);

        return NextResponse.json(
            {
                success: true,
                data: reacts,
                limit,
                offset,
                total,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Get reacts error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while fetching reactions" },
            { status: 500 },
        );
    }
}

/**
 * Like / react — upsert by (postId|commentId, userId).
 * If an active react of the same type exists → unlike (isActive=false).
 * If inactive or different type → activate/update type.
 */
export async function POST(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const body = await request.json();
        const parsed = upsertReactSchema.safeParse(body);

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

        const postId = parsed.data.postId ?? null;
        const commentId = parsed.data.commentId ?? null;
        const type = toPrismaReactType(parsed.data.type);

        const access = await resolveTargetAccess({ postId, commentId, userId: auth.userId });
        if (!access.ok) {
            const status = access.reason === "not_found" ? 404 : 403;
            const message =
                access.reason === "not_found" ? "Target not found" : "You cannot react to this content";
            return NextResponse.json({ success: false, message }, { status });
        }

        const existing = await prisma.react.findFirst({
            where: postId
                ? { postId, userId: auth.userId }
                : { commentId: commentId!, userId: auth.userId },
        });

        // Toggle off when same active type
        if (existing?.isActive && existing.type === type) {
            const react = await prisma.react.update({
                where: { id: existing.id },
                data: { isActive: false },
                include: REACT_INCLUDE,
            });

            return NextResponse.json(
                {
                    success: true,
                    message: "Reaction removed",
                    react,
                    toggled: "off" as const,
                },
                { status: 200 },
            );
        }

        if (existing) {
            const react = await prisma.react.update({
                where: { id: existing.id },
                data: { isActive: true, type },
                include: REACT_INCLUDE,
            });

            return NextResponse.json(
                {
                    success: true,
                    message: "Reaction updated",
                    react,
                    toggled: "on" as const,
                },
                { status: 200 },
            );
        }

        const react = await prisma.react.create({
            data: {
                userId: auth.userId,
                type,
                isActive: true,
                ...(postId ? { postId } : { commentId: commentId! }),
            },
            include: REACT_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Reaction added",
                react,
                toggled: "on" as const,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Upsert react error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while saving the reaction" },
            { status: 500 },
        );
    }
}

/** Change reaction type (own react only) */
export async function PUT(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const body = await request.json();
        const parsed = updateReactSchema.safeParse(body);

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

        const existing = await prisma.react.findUnique({
            where: { id: parsed.data.id },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Reaction not found" }, { status: 404 });
        }

        if (existing.userId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only update your own reaction" },
                { status: 403 },
            );
        }

        const access = await resolveTargetAccess({
            postId: existing.postId,
            commentId: existing.commentId,
            userId: auth.userId,
        });
        if (!access.ok) {
            return NextResponse.json({ success: false, message: "Target not found" }, { status: 404 });
        }

        const react = await prisma.react.update({
            where: { id: existing.id },
            data: {
                type: toPrismaReactType(parsed.data.type),
                isActive: true,
            },
            include: REACT_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Reaction updated successfully",
                react,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Update react error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while updating the reaction" },
            { status: 500 },
        );
    }
}

/** Unlike — soft delete (isActive=false) by id or by postId/commentId for current user */
export async function DELETE(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const { searchParams } = new URL(request.url);
        let payload: unknown = {
            id: searchParams.get("id") || undefined,
            postId: searchParams.get("postId") || undefined,
            commentId: searchParams.get("commentId") || undefined,
        };

        const hasQuery = Boolean(
            searchParams.get("id") || searchParams.get("postId") || searchParams.get("commentId"),
        );

        if (!hasQuery) {
            try {
                payload = await request.json();
            } catch {
                // empty
            }
        }

        const parsed = deleteReactSchema.safeParse(payload);
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

        const existing = parsed.data.id
            ? await prisma.react.findUnique({ where: { id: parsed.data.id } })
            : await prisma.react.findFirst({
                  where: parsed.data.postId
                      ? { postId: parsed.data.postId, userId: auth.userId }
                      : { commentId: parsed.data.commentId!, userId: auth.userId },
              });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Reaction not found" }, { status: 404 });
        }

        if (existing.userId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only remove your own reaction" },
                { status: 403 },
            );
        }

        const react = await prisma.react.update({
            where: { id: existing.id },
            data: { isActive: false },
            include: REACT_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Reaction removed",
                react,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Delete react error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while removing the reaction" },
            { status: 500 },
        );
    }
}
