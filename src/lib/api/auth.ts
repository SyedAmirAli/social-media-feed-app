import type { AuthUser } from "@/types";

export const authKeys = {
    all: ["auth"] as const,
    me: ["auth", "me"] as const,
};

export type AuthMeResponse = {
    success: boolean;
    message?: string;
    user?: AuthUser;
};

export type UpdateProfilePayload = {
    name?: string;
    avatar?: File | null;
    removeAvatar?: boolean;
};

export type UpdateProfileResponse =
    | {
          success: true;
          message: string;
          user: AuthUser;
      }
    | {
          success: false;
          message: string;
          errors?: Record<string, string[] | undefined>;
      };

/**
 * Client fetcher for GET /api/auth/me.
 * Uses credentials so the Authorization cookie is sent.
 */
export async function fetchAuthMe(): Promise<AuthMeResponse> {
    const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (response.status === 401) {
        return { success: false, message: "Unauthorized" };
    }

    if (!response.ok) {
        throw new Error("Failed to fetch authenticated user");
    }

    return response.json() as Promise<AuthMeResponse>;
}

/** Update name and/or avatar via POST /api/auth/me (multipart) */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
    const form = new FormData();

    if (payload.name !== undefined) {
        form.append("name", payload.name);
    }
    if (payload.avatar) {
        form.append("avatar", payload.avatar);
    }
    if (payload.removeAvatar) {
        form.append("removeAvatar", "true");
    }

    const response = await fetch("/api/auth/me", {
        method: "POST",
        credentials: "include",
        body: form,
    });

    return (await response.json()) as UpdateProfileResponse;
}
