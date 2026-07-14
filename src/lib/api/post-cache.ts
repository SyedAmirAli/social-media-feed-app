import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { postKeys } from "@/lib/api/post";
import type { AuthUser, Comment, Post, PostsListResponse, React as ReactRecord } from "@/types";
import { React as ReactKind } from "@/types/enums";

type PostsQueryData = PostsListResponse | InfiniteData<PostsListResponse>;

export type PostsCacheSnapshot = Array<readonly [readonly unknown[], PostsQueryData | undefined]>;

function isInfinitePostsData(data: PostsQueryData): data is InfiniteData<PostsListResponse> {
    return "pages" in data && Array.isArray(data.pages);
}

function mapPostsQueryData(data: PostsQueryData, updater: (posts: Post[]) => Post[]): PostsQueryData {
    if (isInfinitePostsData(data)) {
        return {
            ...data,
            pages: data.pages.map((page) =>
                page.data ? { ...page, data: updater(page.data) } : page,
            ),
        };
    }
    if (!data.data) return data;
    return { ...data, data: updater(data.data) };
}

export function snapshotPostsCache(queryClient: QueryClient): PostsCacheSnapshot {
    return queryClient.getQueriesData<PostsQueryData>({ queryKey: postKeys.all });
}

export function restorePostsCache(queryClient: QueryClient, snapshots: PostsCacheSnapshot) {
    for (const [key, data] of snapshots) {
        queryClient.setQueryData(key, data);
    }
}

export function patchPostsCache(queryClient: QueryClient, updater: (posts: Post[]) => Post[]) {
    const queries = queryClient.getQueriesData<PostsQueryData>({ queryKey: postKeys.all });
    for (const [key, data] of queries) {
        if (!data) continue;
        queryClient.setQueryData<PostsQueryData>(key, mapPostsQueryData(data, updater));
    }
}

export function patchPostInCache(queryClient: QueryClient, postId: string, updater: (post: Post) => Post) {
    patchPostsCache(queryClient, (posts) => posts.map((post) => (post.id === postId ? updater(post) : post)));
}

function toAuthor(user: AuthUser) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
    };
}

function mapCommentTree(comments: Comment[], commentId: string, updater: (comment: Comment) => Comment): Comment[] {
    return comments.map((comment) => {
        if (comment.id === commentId) return updater(comment);
        if (comment.replies?.length) {
            return { ...comment, replies: mapCommentTree(comment.replies, commentId, updater) };
        }
        return comment;
    });
}

function applyReactOptimistic(
    reacts: ReactRecord[] | undefined,
    user: AuthUser,
    type: ReactKind,
    target: { postId?: string; commentId?: string },
): ReactRecord[] {
    const next = [...(reacts ?? [])];
    const index = next.findIndex((react) => react.userId === user.id && react.isActive !== false);

    if (index >= 0) {
        const existing = next[index];
        if (String(existing.type) === type) {
            next.splice(index, 1);
        } else {
            next[index] = { ...existing, type, isActive: true };
        }
        return next;
    }

    next.unshift({
        id: `temp-react-${user.id}-${Date.now()}`,
        type,
        userId: user.id,
        postId: target.postId ?? null,
        commentId: target.commentId ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
        user: toAuthor(user),
    });

    return next;
}

export function optimisticTogglePostReact(
    queryClient: QueryClient,
    postId: string,
    user: AuthUser,
    type: ReactKind,
): PostsCacheSnapshot {
    const snapshots = snapshotPostsCache(queryClient);
    patchPostInCache(queryClient, postId, (post) => {
        const reacts = applyReactOptimistic(post.reacts, user, type, { postId });
        return {
            ...post,
            reacts,
            _count: {
                comments: post._count?.comments ?? post.comments?.length ?? 0,
                reacts: reacts.length,
            },
        };
    });
    return snapshots;
}

export function optimisticToggleCommentReact(
    queryClient: QueryClient,
    postId: string,
    commentId: string,
    user: AuthUser,
    type: ReactKind,
): PostsCacheSnapshot {
    const snapshots = snapshotPostsCache(queryClient);
    patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        comments: mapCommentTree(post.comments ?? [], commentId, (comment) => {
            const reacts = applyReactOptimistic(comment.reacts, user, type, { commentId });
            return {
                ...comment,
                reacts,
                _count: {
                    replies: comment._count?.replies ?? comment.replies?.length ?? 0,
                    reacts: reacts.length,
                },
            };
        }),
    }));
    return snapshots;
}

export function optimisticAddComment(
    queryClient: QueryClient,
    postId: string,
    user: AuthUser,
    content: string,
    tempId: string,
): PostsCacheSnapshot {
    const snapshots = snapshotPostsCache(queryClient);
    const optimistic: Comment = {
        id: tempId,
        content,
        postId,
        authorId: user.id,
        parentCommentId: null,
        repliedToId: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        author: toAuthor(user),
        replies: [],
        reacts: [],
        _count: { reacts: 0, replies: 0 },
    };

    patchPostInCache(queryClient, postId, (post) => {
        const comments = [optimistic, ...(post.comments ?? [])];
        return {
            ...post,
            comments,
            _count: {
                reacts: post._count?.reacts ?? post.reacts?.length ?? 0,
                comments: (post._count?.comments ?? 0) + 1,
            },
        };
    });

    return snapshots;
}

export function optimisticAddReply(
    queryClient: QueryClient,
    postId: string,
    user: AuthUser,
    payload: {
        content: string;
        parentCommentId: string;
        repliedToId: string;
        repliedTo?: Comment["repliedTo"];
        tempId: string;
    },
): PostsCacheSnapshot {
    const snapshots = snapshotPostsCache(queryClient);
    const optimistic: Comment = {
        id: payload.tempId,
        content: payload.content,
        postId,
        authorId: user.id,
        parentCommentId: payload.parentCommentId,
        repliedToId: payload.repliedToId,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        author: toAuthor(user),
        repliedTo: payload.repliedTo ?? null,
        replies: [],
        reacts: [],
        _count: { reacts: 0, replies: 0 },
    };

    patchPostInCache(queryClient, postId, (post) => {
        const comments = (post.comments ?? []).map((comment) => {
            if (comment.id !== payload.parentCommentId) return comment;
            const replies = [...(comment.replies ?? []), optimistic];
            return {
                ...comment,
                replies,
                _count: {
                    reacts: comment._count?.reacts ?? comment.reacts?.length ?? 0,
                    replies: replies.length,
                },
            };
        });

        return {
            ...post,
            comments,
            _count: {
                reacts: post._count?.reacts ?? post.reacts?.length ?? 0,
                comments: (post._count?.comments ?? 0) + 1,
            },
        };
    });

    return snapshots;
}

export function reconcilePostReact(
    queryClient: QueryClient,
    postId: string,
    userId: string,
    result: { react: ReactRecord; toggled: "on" | "off" },
) {
    patchPostInCache(queryClient, postId, (post) => {
        let reacts = (post.reacts ?? []).filter((react) => react.userId !== userId);
        if (result.toggled === "on" && result.react.isActive !== false) {
            reacts = [{ ...result.react, isActive: true }, ...reacts];
        }
        return {
            ...post,
            reacts,
            _count: {
                comments: post._count?.comments ?? post.comments?.length ?? 0,
                reacts: reacts.length,
            },
        };
    });
}

export function reconcileCommentReact(
    queryClient: QueryClient,
    postId: string,
    commentId: string,
    userId: string,
    result: { react: ReactRecord; toggled: "on" | "off" },
) {
    patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        comments: mapCommentTree(post.comments ?? [], commentId, (comment) => {
            let reacts = (comment.reacts ?? []).filter((react) => react.userId !== userId);
            if (result.toggled === "on" && result.react.isActive !== false) {
                reacts = [{ ...result.react, isActive: true }, ...reacts];
            }
            return {
                ...comment,
                reacts,
                _count: {
                    replies: comment._count?.replies ?? comment.replies?.length ?? 0,
                    reacts: reacts.length,
                },
            };
        }),
    }));
}

export function replaceTempComment(
    queryClient: QueryClient,
    postId: string,
    tempId: string,
    realComment: Comment,
) {
    patchPostInCache(queryClient, postId, (post) => {
        const replaceInTree = (comments: Comment[]): Comment[] =>
            comments.map((comment) => {
                if (comment.id === tempId) {
                    return {
                        ...realComment,
                        replies: realComment.replies ?? comment.replies ?? [],
                    };
                }
                if (comment.replies?.length) {
                    return { ...comment, replies: replaceInTree(comment.replies) };
                }
                return comment;
            });

        return { ...post, comments: replaceInTree(post.comments ?? []) };
    });
}
