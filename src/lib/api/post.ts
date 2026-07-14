import type {
    CreatePostPayload,
    CreatePostResponse,
    FetchPostsOptions,
    FetchPostsParams,
    PostsListResponse,
} from "@/types";
import { PostStatus } from "@/types/enums";

export const DEFAULT_POSTS_LIMIT = 10;
export const DEFAULT_POSTS_OFFSET = 0;

export const postKeys = {
    all: ["posts"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
        [
            "posts",
            "list",
            { limit: params?.limit ?? DEFAULT_POSTS_LIMIT, offset: params?.offset ?? DEFAULT_POSTS_OFFSET },
        ] as const,
    infinite: (params?: { limit?: number }) =>
        ["posts", "infinite", { limit: params?.limit ?? DEFAULT_POSTS_LIMIT }] as const,
};

export function getNextPostsPageParam(lastPage: PostsListResponse): number | undefined {
    const offset = lastPage.offset ?? DEFAULT_POSTS_OFFSET;
    const count = lastPage.data?.length ?? 0;
    const total = lastPage.total ?? 0;
    const nextOffset = offset + count;
    if (count === 0 || nextOffset >= total) return undefined;
    return nextOffset;
}

function buildPostsUrl(params: FetchPostsParams = {}, baseUrl = ""): string {
    const limit = params.limit ?? DEFAULT_POSTS_LIMIT;
    const offset = params.offset ?? DEFAULT_POSTS_OFFSET;
    const search = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    });
    const path = `/api/post?${search.toString()}`;
    return baseUrl ? `${baseUrl.replace(/\/+$/, "")}${path}` : path;
}

/** Client or server fetch for GET /api/post */
export async function fetchPosts(
    params: FetchPostsParams = {},
    options: FetchPostsOptions = {},
): Promise<PostsListResponse> {
    const response = await fetch(buildPostsUrl(params, options.baseUrl), {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
            ...(options.cookie ? { Cookie: options.cookie } : {}),
        },
        cache: "no-store",
    });

    if (!response.ok) {
        let message = "Failed to fetch posts";
        try {
            const body = (await response.json()) as { message?: string };
            if (body.message) message = body.message;
        } catch {
            /* ignore */
        }
        return { success: false, message, data: [], total: 0, limit: params.limit, offset: params.offset };
    }

    return (await response.json()) as PostsListResponse;
}

export async function createPost(payload: CreatePostPayload): Promise<CreatePostResponse> {
    const form = new FormData();
    form.append("content", payload.content);
    form.append("status", payload.status ?? PostStatus.PUBLIC);

    if (payload.image) {
        form.append("image", payload.image);
    }

    const response = await fetch("/api/post", {
        method: "POST",
        credentials: "include",
        body: form,
    });

    return (await response.json()) as CreatePostResponse;
}

export type DeletePostResponse =
    | { success: true; message: string; id: string }
    | { success: false; message: string; errors?: Record<string, string[] | undefined> };

export async function deletePost(id: string): Promise<DeletePostResponse> {
    const response = await fetch(`/api/post?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
    });
    return (await response.json()) as DeletePostResponse;
}
