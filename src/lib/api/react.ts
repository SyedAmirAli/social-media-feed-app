import type { React as ReactRecord } from "@/types";
import { React as ReactKind } from "@/types/enums";

export const reactKeys = {
    all: ["reacts"] as const,
    byPost: (postId: string) => ["reacts", "post", postId] as const,
    byComment: (commentId: string) => ["reacts", "comment", commentId] as const,
};

export type UpsertReactPayload = {
    postId?: string | null;
    commentId?: string | null;
    type?: ReactKind;
};

export type UpsertReactResponse =
    | {
          success: true;
          message: string;
          react: ReactRecord;
          toggled: "on" | "off";
      }
    | { success: false; message: string; errors?: Record<string, string[] | undefined> };

export type ListReactsParams = {
    postId?: string;
    commentId?: string;
    limit?: number;
    offset?: number;
};

export type ListReactsResponse =
    | {
          success: true;
          data: ReactRecord[];
          limit: number;
          offset: number;
          total: number;
      }
    | { success: false; message: string };

export async function listReacts(params: ListReactsParams): Promise<ListReactsResponse> {
    const search = new URLSearchParams();
    if (params.postId) search.set("postId", params.postId);
    if (params.commentId) search.set("commentId", params.commentId);
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.offset != null) search.set("offset", String(params.offset));

    const response = await fetch(`/api/react?${search.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
    });
    return (await response.json()) as ListReactsResponse;
}

export async function upsertReact(payload: UpsertReactPayload): Promise<UpsertReactResponse> {
    const response = await fetch("/api/react", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            type: payload.type ?? ReactKind.LIKE,
            ...(payload.postId ? { postId: payload.postId } : {}),
            ...(payload.commentId ? { commentId: payload.commentId } : {}),
        }),
    });
    return (await response.json()) as UpsertReactResponse;
}
