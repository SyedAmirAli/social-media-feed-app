import { NextResponse } from "next/server";
import Auth from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { createCommentSchema, deleteCommentSchema, updateCommentSchema } from "@/lib/validations/comment";
import { PostStatus } from "@/types/enums";
import type { CommentInclude, UserSelect } from "../../../../prisma/generated/models";

const AUTHOR_SELECT = {
    id: true,
    name: true,
    email: true,
    avatar: true,
} satisfies UserSelect;

const COMMENT_INCLUDE = {
    author: { select: AUTHOR_SELECT },
    repliedTo: { select: AUTHOR_SELECT },
    reacts: {
        where: { isActive: true },
        select: {
            id: true,
            type: true,
            userId: true,
            isActive: true,
            createdAt: true,
            user: { select: AUTHOR_SELECT },
        },
    },
    _count: {
        select: {
            reacts: { where: { isActive: true } },
            replies: true,
        },
    },
} satisfies CommentInclude;

async function canAccessPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true, authorId: true },
    });

    if (!post) return { ok: false, reason: "not_found" as const };
    if (post.status === PostStatus.PRIVATE && post.authorId !== userId) {
        return { ok: false, reason: "forbidden" as const };
    }
    return { ok: true, post };
}

/**
 * List comments for a post (`?postId=`).
 * Top-level comments with nested replies. Newest replies first under each parent.
 */
export async function GET(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get("postId") ?? "";
        const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);
        const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

        if (!postId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "postId is required",
                    errors: { postId: ["postId is required"] },
                },
                { status: 400 },
            );
        }

        const access = await canAccessPost(postId, auth.userId);
        if (!access.ok) {
            const status = access.reason === "not_found" ? 404 : 403;
            const message = access.reason === "not_found" ? "Post not found" : "You cannot view comments on this post";
            return NextResponse.json({ success: false, message }, { status });
        }

        const where = { postId, parentCommentId: null as string | null };

        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { createdAt: "desc" },
                include: {
                    ...COMMENT_INCLUDE,
                    replies: {
                        orderBy: { createdAt: "asc" },
                        include: COMMENT_INCLUDE,
                    },
                },
            }),
            prisma.comment.count({ where }),
        ]);

        return NextResponse.json(
            {
                success: true,
                data: comments,
                limit,
                offset,
                total,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Get comments error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while fetching comments" },
            { status: 500 },
        );
    }
}

/** Create a comment or reply */
export async function POST(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const body = await request.json();
        const parsed = createCommentSchema.safeParse(body);

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

        const { postId, content, parentCommentId, repliedToId } = parsed.data;

        const access = await canAccessPost(postId, auth.userId);
        if (!access.ok) {
            const status = access.reason === "not_found" ? 404 : 403;
            const message = access.reason === "not_found" ? "Post not found" : "You cannot comment on this post";
            return NextResponse.json({ success: false, message }, { status });
        }

        if (parentCommentId) {
            const parent = await prisma.comment.findFirst({
                where: { id: parentCommentId, postId },
                select: { id: true, authorId: true },
            });

            if (!parent) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Parent comment not found on this post",
                        errors: { parentCommentId: ["Parent comment not found on this post"] },
                    },
                    { status: 404 },
                );
            }
        }

        if (repliedToId) {
            const repliedUser = await prisma.user.findUnique({
                where: { id: repliedToId },
                select: { id: true },
            });
            if (!repliedUser) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Replied-to user not found",
                        errors: { repliedToId: ["Replied-to user not found"] },
                    },
                    { status: 404 },
                );
            }
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId,
                authorId: auth.userId,
                parentCommentId: parentCommentId ?? null,
                repliedToId: repliedToId ?? null,
            },
            include: {
                ...COMMENT_INCLUDE,
                replies: { include: COMMENT_INCLUDE },
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: parentCommentId ? "Reply added successfully" : "Comment added successfully",
                comment,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Create comment error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while creating the comment" },
            { status: 500 },
        );
    }
}

/** Update own comment */
export async function PUT(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const body = await request.json();
        const parsed = updateCommentSchema.safeParse(body);

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

        const existing = await prisma.comment.findUnique({
            where: { id: parsed.data.id },
            select: { id: true, authorId: true, postId: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Comment not found" }, { status: 404 });
        }

        if (existing.authorId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only edit your own comments" },
                { status: 403 },
            );
        }

        const access = await canAccessPost(existing.postId, auth.userId);
        if (!access.ok) {
            return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
        }

        const comment = await prisma.comment.update({
            where: { id: existing.id },
            data: { content: parsed.data.content },
            include: {
                ...COMMENT_INCLUDE,
                replies: {
                    orderBy: { createdAt: "asc" },
                    include: COMMENT_INCLUDE,
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Comment updated successfully",
                comment,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Update comment error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while updating the comment" },
            { status: 500 },
        );
    }
}

/** Delete own comment (replies cascade via Prisma) */
export async function DELETE(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const { searchParams } = new URL(request.url);
        let commentId = searchParams.get("id") ?? "";

        if (!commentId) {
            try {
                const body = await request.json();
                const parsed = deleteCommentSchema.safeParse(body);
                if (parsed.success) commentId = parsed.data.id;
            } catch {
                // no body
            }
        }

        if (!commentId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Comment id is required",
                    errors: { id: ["Comment id is required"] },
                },
                { status: 400 },
            );
        }

        const existing = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { id: true, authorId: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Comment not found" }, { status: 404 });
        }

        if (existing.authorId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only delete your own comments" },
                { status: 403 },
            );
        }

        await prisma.comment.delete({ where: { id: commentId } });

        return NextResponse.json(
            {
                success: true,
                message: "Comment deleted successfully",
                id: commentId,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while deleting the comment" },
            { status: 500 },
        );
    }
}
