import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Feed from "@/components/home/Feed";
import {
    DEFAULT_POSTS_LIMIT,
    DEFAULT_POSTS_OFFSET,
    getNextPostsPageParam,
    postKeys,
} from "@/lib/api/post";
import { fetchPostsServer } from "@/lib/api/post.server";
import { getQueryClient } from "@/lib/query-client";

export default async function Home({
    searchParams,
}: {
    searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
    const { limit, offset } = await searchParams;
    const queryClient = getQueryClient();
    const listParams = {
        limit: Number(limit) || DEFAULT_POSTS_LIMIT,
        offset: Number(offset) || DEFAULT_POSTS_OFFSET,
    };

    await queryClient.prefetchInfiniteQuery({
        queryKey: postKeys.infinite({ limit: listParams.limit }),
        queryFn: ({ pageParam }) =>
            fetchPostsServer({ limit: listParams.limit, offset: pageParam }),
        initialPageParam: listParams.offset,
        getNextPageParam: getNextPostsPageParam,
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Feed limit={listParams.limit} offset={listParams.offset} />
        </HydrationBoundary>
    );
}
