"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import DesktopStories from "@/components/home/feed/DesktopStories";
import MobileStories from "@/components/home/feed/MobileStories";
import CreatePost from "@/components/home/feed/CreatePost";
import {
    DEFAULT_POSTS_LIMIT,
    DEFAULT_POSTS_OFFSET,
    fetchPosts,
    getNextPostsPageParam,
    postKeys,
} from "@/lib/api/post";
import PostList from "./feed/post-details/PostList";

type FeedProps = {
    limit?: number;
    offset?: number;
};

export default function Feed({
    limit = DEFAULT_POSTS_LIMIT,
    offset = DEFAULT_POSTS_OFFSET,
}: FeedProps) {
    const postsQuery = useInfiniteQuery({
        queryKey: postKeys.infinite({ limit }),
        queryFn: ({ pageParam }) => fetchPosts({ limit, offset: pageParam }),
        initialPageParam: offset,
        getNextPageParam: getNextPostsPageParam,
    });

    const posts =
        postsQuery.data?.pages.flatMap((page) => (page.success ? (page.data ?? []) : [])) ?? [];
    const total = postsQuery.data?.pages.find((page) => page.success)?.total ?? 0;
    const hasMore = Boolean(postsQuery.hasNextPage);

    return (
        <div className="_layout_middle_wrap" data-feed-count={posts.length} data-feed-total={total}>
            <div className="_layout_middle_inner">
                <DesktopStories />
                <MobileStories />
                <CreatePost />
                <PostList posts={posts} />
                {hasMore ? (
                    <div className="_feed_load_more">
                        <button
                            type="button"
                            className="_feed_load_more_btn"
                            disabled={postsQuery.isFetchingNextPage}
                            onClick={() => postsQuery.fetchNextPage()}
                        >
                            {postsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
