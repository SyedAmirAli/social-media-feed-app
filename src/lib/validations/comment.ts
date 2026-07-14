import { z } from "zod";

/** Create comment or reply on a post */
export const createCommentSchema = z
    .object({
        postId: z.uuid("Invalid post id"),
        content: z
            .string({ error: "Content is required" })
            .trim()
            .min(1, "Content is required")
            .max(2000, "Content must be at most 2000 characters"),
        parentCommentId: z.uuid("Invalid parent comment id").optional().nullable(),
        repliedToId: z.uuid("Invalid replied-to user id").optional().nullable(),
    })
    .refine((data) => !(data.repliedToId && !data.parentCommentId), {
        message: "repliedToId requires parentCommentId (reply)",
        path: ["repliedToId"],
    });

/** Update own comment content */
export const updateCommentSchema = z.object({
    id: z.uuid("Invalid comment id"),
    content: z
        .string({ error: "Content is required" })
        .trim()
        .min(1, "Content is required")
        .max(2000, "Content must be at most 2000 characters"),
});

export const deleteCommentSchema = z.object({
    id: z.uuid("Invalid comment id"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
