import { z } from "zod";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
export const AVATAR_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
] as const;

const avatarFileSchema = z
    .file({ error: "Avatar must be a valid file" })
    .mime([...AVATAR_MIME_TYPES], {
        message: "Avatar must be jpeg, png, webp, or gif",
    })
    .max(MAX_AVATAR_BYTES, {
        message: "Avatar must be at most 5MB",
    });

/** Update profile via multipart FormData (name + optional avatar). */
export const updateProfileSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(100, "Name must be at most 100 characters")
            .optional(),
        avatar: avatarFileSchema.optional(),
        removeAvatar: z.boolean().optional().default(false),
    })
    .refine((data) => data.name !== undefined || data.avatar !== undefined || data.removeAvatar, {
        message: "Provide a name and/or avatar to update",
    });

/** Update profile via JSON (name only, or removeAvatar). */
export const updateProfileJsonSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(100, "Name must be at most 100 characters")
            .optional(),
        removeAvatar: z.boolean().optional().default(false),
    })
    .refine((data) => data.name !== undefined || data.removeAvatar, {
        message: "Provide a name to update",
    });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileJsonInput = z.infer<typeof updateProfileJsonSchema>;
