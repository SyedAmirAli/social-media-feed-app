import { z } from "zod";
import { PostStatus } from "@/types/enums";

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const POST_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
    "image/heic",
    "image/heif",
] as const;

export const postStatusSchema = z.enum(PostStatus);

const postImageFileSchema = z
    .file({ error: "Image must be a valid file" })
    .mime([...POST_IMAGE_MIME_TYPES], {
        message: "Image must be jpeg, png, webp, or gif",
    })
    .max(MAX_POST_IMAGE_BYTES, {
        message: "Image must be at most 5MB",
    });

/** Create post — matches Prisma Post (content, image?, status) */
export const createPostSchema = z.object({
    content: z
        .string({ error: "Content is required" })
        .trim()
        .min(1, "Content is required")
        .max(5000, "Content must be at most 5000 characters"),
    status: postStatusSchema.optional().default(PostStatus.PUBLIC),
    image: postImageFileSchema.optional(),
});

/**
 * Update post — all fields optional except id.
 * - `image` as File → replace with new upload
 * - `image` as string → keep/set R2 storage path
 * - `removeImage: true` → clear image
 */
export const updatePostSchema = z
    .object({
        id: z.uuid("Invalid post id"),
        content: z
            .string()
            .trim()
            .min(1, "Content is required")
            .max(5000, "Content must be at most 5000 characters")
            .optional(),
        status: postStatusSchema.optional(),
        image: z.union([postImageFileSchema, z.string().trim().min(1)]).optional(),
        removeImage: z.boolean().optional().default(false),
    })
    .refine(
        (data) =>
            data.content !== undefined || data.status !== undefined || data.image !== undefined || data.removeImage,
        {
            message: "Provide at least one field to update",
        },
    )
    .refine((data) => !(data.image && data.removeImage), {
        message: "Cannot set image and removeImage at the same time",
        path: ["removeImage"],
    });

/** JSON-only create (image already uploaded → full R2 path/key) */
export const createPostJsonSchema = z.object({
    content: z
        .string({ error: "Content is required" })
        .trim()
        .min(1, "Content is required")
        .max(5000, "Content must be at most 5000 characters"),
    status: postStatusSchema.optional().default(PostStatus.PUBLIC),
    image: z.string().trim().min(1).max(500).optional().nullable(),
});

/** JSON-only update */
export const updatePostJsonSchema = z
    .object({
        id: z.uuid("Invalid post id"),
        content: z
            .string()
            .trim()
            .min(1, "Content is required")
            .max(5000, "Content must be at most 5000 characters")
            .optional(),
        status: postStatusSchema.optional(),
        image: z.string().trim().min(1).max(500).optional().nullable(),
        removeImage: z.boolean().optional().default(false),
    })
    .refine(
        (data) =>
            data.content !== undefined || data.status !== undefined || data.image !== undefined || data.removeImage,
        { message: "Provide at least one field to update" },
    );

/** Patch visibility only */
export const patchPostStatusSchema = z.object({
    id: z.uuid("Invalid post id"),
    status: postStatusSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreatePostBody = z.input<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type UpdatePostBody = z.input<typeof updatePostSchema>;
export type CreatePostJsonInput = z.infer<typeof createPostJsonSchema>;
export type UpdatePostJsonInput = z.infer<typeof updatePostJsonSchema>;
export type PatchPostStatusInput = z.infer<typeof patchPostStatusSchema>;
