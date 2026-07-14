import { cookies, headers } from "next/headers";
import {
    DEFAULT_POSTS_LIMIT,
    DEFAULT_POSTS_OFFSET,
    fetchPosts,
} from "@/lib/api/post";
import type { FetchPostsParams, PostsListResponse } from "@/types";

async function getServerRequestContext() {
    const headerStore = await headers();
    const cookieStore = await cookies();

    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

    return {
        baseUrl,
        cookie: cookieStore.toString(),
    };
}

/** Authenticated GET /api/post for RSC / TanStack prefetch */
export async function fetchPostsServer(
    params: FetchPostsParams = {
        limit: DEFAULT_POSTS_LIMIT,
        offset: DEFAULT_POSTS_OFFSET,
    },
): Promise<PostsListResponse> {
    const { baseUrl, cookie } = await getServerRequestContext();
    return fetchPosts(params, { baseUrl, cookie });
}
