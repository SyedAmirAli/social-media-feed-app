import { NextResponse } from "next/server";
import Auth from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import Bucket from "@/lib/r2/bucket";
import { AVATAR_MIME_TYPES, updateProfileJsonSchema, updateProfileSchema } from "@/lib/validations/profile";

async function deleteStoredAvatar(avatarKey: string | null | undefined) {
    if (!avatarKey) return;
    try {
        const bucket = new Bucket();
        await bucket.deleteObject(avatarKey);
    } catch (error) {
        console.error("Failed to delete avatar from R2:", error);
    }
}

export async function GET(request: Request) {
    const auth = await Auth.requireAuth(request);

    if (!Auth.isAuthContext(auth)) return auth;

    return NextResponse.json(
        {
            success: true,
            message: "User authenticated",
            user: auth.user,
        },
        { status: 200 },
    );
}

/**
 * Update authenticated user profile (name and/or avatar).
 * Accepts JSON `{ name?, removeAvatar? }` or multipart FormData with `name`, `avatar`, `removeAvatar`.
 */
export async function POST(request: Request) {
    try {
        const auth = await Auth.requireAuth(request);
        if (!Auth.isAuthContext(auth)) return auth;

        const contentType = request.headers.get("content-type") ?? "";
        let name: string | undefined;
        let removeAvatar = false;
        let nextAvatar: string | null | undefined;

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const avatarEntry = form.get("avatar");
            const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : undefined;
            const removeRaw = form.get("removeAvatar");
            const nameRaw = form.get("name");

            const parsed = updateProfileSchema.safeParse({
                name: nameRaw == null || String(nameRaw).trim() === "" ? undefined : String(nameRaw),
                avatar: avatarFile,
                removeAvatar: removeRaw === "true" || removeRaw === "1" || removeRaw === "on",
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

            name = parsed.data.name;
            removeAvatar = parsed.data.removeAvatar;

            if (parsed.data.avatar) {
                if (
                    parsed.data.avatar.type &&
                    !AVATAR_MIME_TYPES.includes(parsed.data.avatar.type as (typeof AVATAR_MIME_TYPES)[number])
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: "Invalid avatar type",
                            errors: { avatar: ["Avatar must be jpeg, png, webp, or gif"] },
                        },
                        { status: 400 },
                    );
                }
                nextAvatar = await Bucket.uploadImage(parsed.data.avatar, auth.userId, "avatars");
            } else if (removeAvatar) {
                nextAvatar = null;
            }
        } else {
            const body = await request.json();
            const parsed = updateProfileJsonSchema.safeParse(body);

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

            name = parsed.data.name;
            removeAvatar = parsed.data.removeAvatar;
            if (removeAvatar) nextAvatar = null;
        }

        const previousAvatar = auth.user.avatar;

        const user = await prisma.user.update({
            where: { id: auth.userId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(nextAvatar !== undefined ? { avatar: nextAvatar } : {}),
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

        // Replace or remove avatar — delete old R2 object after DB update
        if (nextAvatar !== undefined && previousAvatar && previousAvatar !== nextAvatar) {
            await deleteStoredAvatar(previousAvatar);
        }

        return NextResponse.json(
            {
                success: true,
                message: "Profile updated successfully",
                user,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Update profile error:", error);
        return NextResponse.json(
            { success: false, message: "Something went wrong while updating the profile" },
            { status: 500 },
        );
    }
}

/** Update profile — same handler as POST (multipart / JSON) */
export async function PUT(request: Request) {
    return POST(request);
}
