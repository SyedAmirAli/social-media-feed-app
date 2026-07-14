import { NextResponse } from "next/server";
import Auth from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import Bucket from "@/lib/r2/bucket";
import {
    createPostJsonSchema,
    createPostSchema,
    POST_IMAGE_MIME_TYPES,
    updatePostJsonSchema,
    updatePostSchema,
    patchPostStatusSchema,
} from "@/lib/validations/post";
import { PostStatus } from "@/types/enums";
import { UserSelect } from "../../../../prisma/generated/models";
import type { Prisma } from "../../../../prisma/generated/client";

const AUTHOR_SELECT = {
    id: true,
    name: true,
    email: true,
    avatar: true,
} satisfies UserSelect;

const REACT_SELECT = {
    id: true,
    type: true,
    userId: true,
    isActive: true,
    createdAt: true,
    user: { select: AUTHOR_SELECT },
} as const;

const COMMENT_INCLUDE = {
    author: { select: AUTHOR_SELECT },
    repliedTo: { select: AUTHOR_SELECT },
    reacts: {
        where: { isActive: true },
        select: REACT_SELECT,
    },
    _count: {
        select: {
            reacts: { where: { isActive: true } },
            replies: true,
        },
    },
} as const;

const POST_INCLUDE = {
    author: { select: AUTHOR_SELECT },
    reacts: true,
    _count: {
        select: {
            comments: true,
            reacts: true,
        },
    },
} as const;

async function deleteStoredImage(imageKey: string | null | undefined) {
    if (!imageKey) return;
    try {
        const bucket = new Bucket();
        await bucket.deleteObject(imageKey);
    } catch (error) {
        console.error("Failed to delete post image from R2:", error);
    }
}

/**
 * Feed: public posts from everyone + private posts owned by the current user.
 * Newest first. Includes active reacts + comment hierarchy (parent → replies).
 * Pagination via `limit` / `offset`.
 */
export async function GET(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const queryParams = Object.fromEntries(new URL(request.url).searchParams.entries());
        const limit = Math.min(Math.max(parseInt(queryParams.limit ?? "10", 10) || 10, 1), 50);
        const offset = Math.max(parseInt(queryParams.offset ?? "0", 10) || 0, 0);

        const where = {
            OR: [{ status: PostStatus.PUBLIC }, { status: PostStatus.PRIVATE, authorId: auth.userId }],
        };

        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: AUTHOR_SELECT },
                    reacts: {
                        where: { isActive: true },
                        select: REACT_SELECT,
                        orderBy: { createdAt: "desc" },
                    },
                    comments: {
                        where: { parentCommentId: null },
                        orderBy: { createdAt: "desc" },
                        include: {
                            ...COMMENT_INCLUDE,
                            replies: {
                                orderBy: { createdAt: "asc" },
                                include: COMMENT_INCLUDE,
                            },
                        },
                    },
                    _count: {
                        select: {
                            comments: true,
                            reacts: { where: { isActive: true } },
                        },
                    },
                },
            }),
            prisma.post.count({ where }),
        ]);

        return NextResponse.json(
            {
                success: true,
                data: posts,
                limit,
                offset,
                total,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Get posts error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while fetching posts" },
            { status: 500 },
        );
    }
}

/** Create a post (JSON or multipart FormData with optional image file). */
export async function POST(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const contentType = request.headers.get("content-type") ?? "";
        let content: string;
        let status: PostStatus;
        let imagePath: string | null = null;

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const imageEntry = form.get("image");
            const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : undefined;

            const parsed = createPostSchema.safeParse({
                content: String(form.get("content") ?? ""),
                status: form.get("status") || undefined,
                image: imageFile,
            });

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

            content = parsed.data.content;
            status = parsed.data.status;

            if (parsed.data.image) {
                if (
                    parsed.data.image.type &&
                    !POST_IMAGE_MIME_TYPES.includes(parsed.data.image.type as (typeof POST_IMAGE_MIME_TYPES)[number])
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: "Invalid image type",
                            errors: { image: ["Image must be jpeg, png, webp, gif, or similar"] },
                        },
                        { status: 400 },
                    );
                }
                imagePath = await Bucket.uploadImage(parsed.data.image, auth.userId, "posts");
            }
        } else {
            const body = await request.json();
            const parsed = createPostJsonSchema.safeParse(body);

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

            content = parsed.data.content;
            status = parsed.data.status;
            imagePath = parsed.data.image ?? null;
        }

        const post = await prisma.post.create({
            data: {
                content,
                status,
                image: imagePath,
                authorId: auth.userId,
            },
            include: POST_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Post created successfully",
                post,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Create post error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while creating the post" },
            { status: 500 },
        );
    }
}

/** Update own post (JSON or multipart FormData). */
export async function PUT(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const contentType = request.headers.get("content-type") ?? "";
        let postId: string;
        let content: string | undefined;
        let status: PostStatus | undefined;
        let removeImage = false;
        let nextImage: string | File | null | undefined;

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const imageEntry = form.get("image");
            const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : undefined;
            const removeRaw = form.get("removeImage");

            const parsed = updatePostSchema.safeParse({
                id: String(form.get("id") ?? ""),
                content: form.get("content") != null ? String(form.get("content")) : undefined,
                status: form.get("status") || undefined,
                image: imageFile,
                removeImage: removeRaw === "true" || removeRaw === "1",
            });

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

            postId = parsed.data.id;
            content = parsed.data.content;
            status = parsed.data.status;
            removeImage = parsed.data.removeImage;
            nextImage = parsed.data.image;
        } else {
            const body = await request.json();
            const parsed = updatePostJsonSchema.safeParse(body);

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

            postId = parsed.data.id;
            content = parsed.data.content;
            status = parsed.data.status;
            removeImage = parsed.data.removeImage;
            nextImage = parsed.data.image === undefined ? undefined : parsed.data.image;
        }

        const existing = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, authorId: true, image: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
        }

        if (existing.authorId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only update your own posts" },
                { status: 403 },
            );
        }

        const data: Prisma.PostUpdateInput = {};

        if (content !== undefined) data.content = content;
        if (status !== undefined) data.status = status;

        if (removeImage) {
            await deleteStoredImage(existing.image);
            data.image = null;
        } else if (nextImage instanceof File) {
            const uploadedKey = await Bucket.uploadImage(nextImage, auth.userId, "posts");
            await deleteStoredImage(existing.image);
            data.image = uploadedKey;
        } else if (typeof nextImage === "string") {
            if (existing.image && existing.image !== nextImage) {
                await deleteStoredImage(existing.image);
            }
            data.image = nextImage;
        } else if (nextImage === null) {
            await deleteStoredImage(existing.image);
            data.image = null;
        }

        const post = await prisma.post.update({
            where: { id: postId },
            data,
            include: POST_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Post updated successfully",
                post,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Update post error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while updating the post" },
            { status: 500 },
        );
    }
}

/** Patch post visibility/status only. Body: `{ id, status }`. */
export async function PATCH(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const body = await request.json();
        const parsed = patchPostStatusSchema.safeParse(body);

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

        const { id: postId, status } = parsed.data;

        const existing = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, authorId: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
        }

        if (existing.authorId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only update your own posts" },
                { status: 403 },
            );
        }

        const post = await prisma.post.update({
            where: { id: postId },
            data: { status },
            include: POST_INCLUDE,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Post visibility updated successfully",
                post,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Patch post status error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while updating post visibility" },
            { status: 500 },
        );
    }
}

/** Delete own post. Accepts `id` from query string or JSON body. */
export async function DELETE(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const { searchParams } = new URL(request.url);
        let postId = searchParams.get("id") ?? "";

        if (!postId) {
            try {
                const body = await request.json();
                postId = String(body?.id ?? "");
            } catch {
                // no body
            }
        }

        if (!postId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Post id is required",
                    errors: { id: ["Post id is required"] },
                },
                { status: 400 },
            );
        }

        const existing = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, authorId: true, image: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
        }

        if (existing.authorId !== auth.userId) {
            return NextResponse.json(
                { success: false, message: "You can only delete your own posts" },
                { status: 403 },
            );
        }

        await prisma.$transaction(async (tx) => {
            // Comments have no onDelete cascade from Post — remove them first
            await tx.comment.deleteMany({ where: { postId } });
            await tx.post.delete({ where: { id: postId } });
        });

        await deleteStoredImage(existing.image);

        return NextResponse.json(
            {
                success: true,
                message: "Post deleted successfully",
                id: postId,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Delete post error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while deleting the post" },
            { status: 500 },
        );
    }
}
