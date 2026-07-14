import { z } from "zod";
import { React } from "@/types/enums";

export const reactTypeSchema = z.enum(React);

/**
 * Create / toggle reaction on a post OR comment.
 * Exactly one of postId / commentId required.
 */
export const upsertReactSchema = z
    .object({
        postId: z.uuid("Invalid post id").optional().nullable(),
        commentId: z.uuid("Invalid comment id").optional().nullable(),
        type: reactTypeSchema.optional().default(React.LIKE),
    })
    .refine((data) => Boolean(data.postId) !== Boolean(data.commentId), {
        message: "Provide either postId or commentId (not both)",
    });

/** Change reaction type */
export const updateReactSchema = z.object({
    id: z.uuid("Invalid react id"),
    type: reactTypeSchema,
});

/** Unlike — by react id, or by postId/commentId for current user */
export const deleteReactSchema = z
    .object({
        id: z.uuid("Invalid react id").optional(),
        postId: z.uuid("Invalid post id").optional().nullable(),
        commentId: z.uuid("Invalid comment id").optional().nullable(),
    })
    .refine((data) => Boolean(data.id) || Boolean(data.postId) !== Boolean(data.commentId), {
        message: "Provide id, or either postId or commentId",
    });

export type UpsertReactInput = z.infer<typeof upsertReactSchema>;
export type UpdateReactInput = z.infer<typeof updateReactSchema>;
export type DeleteReactInput = z.infer<typeof deleteReactSchema>;
