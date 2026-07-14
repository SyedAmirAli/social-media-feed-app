import type { Comment } from "@/types";

export const commentKeys = {
    all: ["comments"] as const,
    byPost: (postId: string) => ["comments", "post", postId] as const,
};

export type CreateCommentPayload = {
    postId: string;
    content: string;
    parentCommentId?: string | null;
    repliedToId?: string | null;
};

export type CreateCommentResponse =
    | { success: true; message: string; comment: Comment }
    | { success: false; message: string; errors?: Record<string, string[] | undefined> };

export type UpdateCommentPayload = {
    id: string;
    content: string;
};

export async function createComment(payload: CreateCommentPayload): Promise<CreateCommentResponse> {
    const response = await fetch("/api/comment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
    });
    return (await response.json()) as CreateCommentResponse;
}

export async function updateComment(payload: UpdateCommentPayload) {
    const response = await fetch("/api/comment", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
    });
    return response.json();
}

export async function deleteComment(id: string) {
    const response = await fetch(`/api/comment?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
    });
    return response.json();
}
