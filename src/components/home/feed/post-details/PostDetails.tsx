/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    CommentMicIcon,
    CommentPhotoIcon,
    CommentReactionIcon,
    DeletePostIcon,
    EditPostIcon,
    HidePostIcon,
    NotificationBellIcon,
    PostMenuDotsIcon,
    SavePostIcon,
    SendPostIcon,
    ShareReactionIcon,
    ThumbsUpIcon,
} from "@/app/assets/icons";
import { asset } from "@/config/utils";
import { useAuth } from "@/contexts/AppContext";
import { createComment } from "@/lib/api/comment";
import { deletePost, postKeys } from "@/lib/api/post";
import {
    optimisticAddComment,
    optimisticTogglePostReact,
    reconcilePostReact,
    replaceTempComment,
    restorePostsCache,
    type PostsCacheSnapshot,
} from "@/lib/api/post-cache";
import { upsertReact, reactKeys } from "@/lib/api/react";
import type { Post } from "@/types";
import { React as ReactKind } from "@/types/enums";
import { formatDistanceToNowStrict } from "date-fns";
import AutoTextarea from "@/components/ui/AutoTextarea";
import ReactorsModal from "@/components/ui/ReactorsModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CommentItem from "./CommentItem";
import ReactionPicker from "./ReactionPicker";
import { reactionEmoji, reactionLabel, reactorsSummary, uniqueReactTypes } from "./reaction-utils";

const VISIBLE_COMMENTS = 2;

export default function PostDetails({ post }: { post: Post }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [showAllComments, setShowAllComments] = useState(false);
    const [showReactors, setShowReactors] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isOwner = user?.id === post.authorId;
    const comments = post.comments ?? [];
    const visibleComments = showAllComments ? comments : comments.slice(0, VISIBLE_COMMENTS);
    const hiddenCount = Math.max(comments.length - VISIBLE_COMMENTS, 0);

    const myPostReact = useMemo(
        () => post.reacts?.find((r) => r.userId === user?.id && r.isActive),
        [post.reacts, user?.id],
    );

    const reactTypes = uniqueReactTypes(post.reacts);
    const reactTotal = post._count?.reacts ?? post.reacts?.filter((r) => r.isActive).length ?? 0;
    const commentTotal = post._count?.comments ?? comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
    const reactorsLabel = reactorsSummary(post.reacts, reactTotal);

    function invalidateFeed() {
        queryClient.invalidateQueries({ queryKey: postKeys.all });
    }

    const reactMutation = useMutation({
        mutationFn: (type: ReactKind) => upsertReact({ postId: post.id, type }),
        onMutate: async (type) => {
            if (!user) return { snapshots: [] as PostsCacheSnapshot };
            await queryClient.cancelQueries({ queryKey: postKeys.all });
            const snapshots = optimisticTogglePostReact(queryClient, post.id, user, type);
            return { snapshots };
        },
        onSuccess: (result, _type, context) => {
            if (!result.success) {
                if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
                toast.error(result.message || "Failed to react");
                return;
            }
            if (user) {
                reconcilePostReact(queryClient, post.id, user.id, result);
            }
        },
        onError: (_error, _type, context) => {
            if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
            toast.error("Failed to react");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: reactKeys.byPost(post.id) });
        },
    });

    const commentMutation = useMutation({
        mutationFn: createComment,
        onMutate: async (payload) => {
            if (!user) return { snapshots: [] as PostsCacheSnapshot, tempId: "", content: payload.content };
            await queryClient.cancelQueries({ queryKey: postKeys.all });
            const tempId = `temp-comment-${Date.now()}`;
            const snapshots = optimisticAddComment(queryClient, post.id, user, payload.content, tempId);
            setCommentText("");
            return { snapshots, tempId, content: payload.content };
        },
        onSuccess: (result, _payload, context) => {
            if (!result.success) {
                if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
                if (context?.content) setCommentText(context.content);
                toast.error(result.message || "Failed to comment");
                return;
            }
            if (context?.tempId) {
                replaceTempComment(queryClient, post.id, context.tempId, result.comment);
            }
        },
        onError: (_error, _payload, context) => {
            if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
            if (context?.content) setCommentText(context.content);
            toast.error("Failed to comment");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deletePost(post.id),
        onSuccess: (result) => {
            if (!result.success) {
                toast.error(result.message || "Failed to delete post");
                return;
            }
            setShowDeleteConfirm(false);
            setMenuOpen(false);
            toast.success(result.message || "Post deleted successfully");
            invalidateFeed();
        },
        onError: () => toast.error("Failed to delete post"),
    });

    function handleDeletePost() {
        if (deleteMutation.isPending) return;
        setMenuOpen(false);
        setShowDeleteConfirm(true);
    }

    function confirmDeletePost() {
        if (deleteMutation.isPending) return;
        deleteMutation.mutate();
    }

    function submitComment(event: FormEvent) {
        event.preventDefault();
        const content = commentText.trim();
        if (!content) {
            toast.error("Comment is required");
            return;
        }
        commentMutation.mutate({ postId: post.id, content });
    }

    function handleCommentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        if (!commentText.trim() || commentMutation.isPending) return;
        submitComment(event as unknown as FormEvent);
    }

    const activeReactType = (myPostReact?.type as ReactKind) || ReactKind.LIKE;

    return (
        <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
            <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
                <div className="_feed_inner_timeline_post_top">
                    <div className="_feed_inner_timeline_post_box">
                        <div className="_feed_inner_timeline_post_box_image">
                            <img
                                src={asset(post.author?.avatar)}
                                alt={post.author?.name || "User"}
                                className="_mini_avatar"
                            />
                        </div>
                        <div className="_feed_inner_timeline_post_box_txt">
                            <h4 className="_feed_inner_timeline_post_box_title">{post.author?.name || "User"}</h4>
                            <p className="_feed_inner_timeline_post_box_para">
                                {formatDistanceToNowStrict(post.createdAt, { addSuffix: true })}{" "}
                                <span style={{ fontWeight: "bold" }}>{"\u2022"}</span>{" "}
                                <a href="#0" style={{ textTransform: "capitalize" }}>
                                    {post.status?.toLowerCase()}
                                </a>
                            </p>
                        </div>
                    </div>
                    <div className="_feed_inner_timeline_post_box_dropdown">
                        <div className="_feed_timeline_post_dropdown">
                            <button
                                type="button"
                                className="_feed_timeline_post_dropdown_link"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-expanded={menuOpen}
                            >
                                <PostMenuDotsIcon />
                            </button>
                        </div>
                        <div className={`_feed_timeline_dropdown _timeline_dropdown${menuOpen ? " show" : ""}`}>
                            <ul className="_feed_timeline_dropdown_list">
                                <li className="_feed_timeline_dropdown_item">
                                    <a href="#0" className="_feed_timeline_dropdown_link">
                                        <span>
                                            <SavePostIcon />
                                        </span>
                                        Save Post
                                    </a>
                                </li>
                                <li className="_feed_timeline_dropdown_item">
                                    <a href="#0" className="_feed_timeline_dropdown_link">
                                        <span>
                                            <NotificationBellIcon />
                                        </span>
                                        Turn On Notification
                                    </a>
                                </li>
                                <li className="_feed_timeline_dropdown_item">
                                    <a href="#0" className="_feed_timeline_dropdown_link">
                                        <span>
                                            <HidePostIcon />
                                        </span>
                                        Hide
                                    </a>
                                </li>
                                {isOwner ? (
                                    <>
                                        <li className="_feed_timeline_dropdown_item">
                                            <a href="#0" className="_feed_timeline_dropdown_link">
                                                <span>
                                                    <EditPostIcon />
                                                </span>
                                                Edit Post
                                            </a>
                                        </li>
                                        <li className="_feed_timeline_dropdown_item">
                                            <button
                                                type="button"
                                                className="_feed_timeline_dropdown_link"
                                                onClick={handleDeletePost}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <span>
                                                    <DeletePostIcon />
                                                </span>
                                                {deleteMutation.isPending ? "Deleting..." : "Delete Post"}
                                            </button>
                                        </li>
                                    </>
                                ) : null}
                            </ul>
                        </div>
                    </div>
                </div>

                {post.content ? <h4 className="_feed_inner_timeline_post_title">{post.content}</h4> : null}

                {post.image ? (
                    <div className="_feed_inner_timeline_image">
                        <img src={asset(post.image)} alt="" className="_time_img" />
                    </div>
                ) : null}
            </div>

            <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
                <div className="_feed_inner_timeline_total_reacts_image">
                    <button
                        type="button"
                        className="_reactors_summary_btn"
                        disabled={reactTotal === 0}
                        onClick={() => setShowReactors(true)}
                        aria-label={`Show who reacted (${reactTotal})`}
                    >
                        {reactTypes.length > 0 ? (
                            reactTypes.slice(0, 5).map((type, index) => (
                                <span
                                    key={type}
                                    className={`${index === 0 ? "_react_img1" : "_react_img"} _react_summary_emoji`}
                                    title={reactionLabel(type)}
                                >
                                    {reactionEmoji(type)}
                                </span>
                            ))
                        ) : (
                            <span className="_react_img1 _react_summary_emoji">👍</span>
                        )}
                        {reactTotal > 0 ? (
                            <p className="_feed_inner_timeline_total_reacts_para">
                                {reactorsLabel || (reactTotal > 5 ? `${reactTotal}+` : reactTotal)}
                            </p>
                        ) : null}
                    </button>
                </div>
                <div className="_feed_inner_timeline_total_reacts_txt">
                    <p className="_feed_inner_timeline_total_reacts_para1">
                        <button
                            type="button"
                            className="border-0 bg-transparent p-0"
                            onClick={() => commentInputRef.current?.focus()}
                        >
                            <span>{commentTotal}</span> Comment
                        </button>
                    </p>
                    <p className="_feed_inner_timeline_total_reacts_para2">
                        <span>0</span> Share
                    </p>
                </div>
            </div>

            <div className="_feed_inner_timeline_reaction">
                <ReactionPicker
                    variant="post"
                    activeType={myPostReact?.type}
                    disabled={reactMutation.isPending}
                    onToggle={() => reactMutation.mutate(activeReactType)}
                    onPick={(type) => reactMutation.mutate(type)}
                    className="_feed_inner_timeline_reaction_comment _feed_reaction"
                >
                    <span className="_feed_inner_timeline_reaction_link">
                        <span>
                            {myPostReact ? (
                                <>
                                    <span className="_feed_reaction_active_emoji" aria-hidden>
                                        {reactionEmoji(String(myPostReact.type))}
                                    </span>{" "}
                                    {reactionLabel(String(myPostReact.type))}
                                </>
                            ) : (
                                <>
                                    <ThumbsUpIcon /> Like
                                </>
                            )}
                        </span>
                    </span>
                </ReactionPicker>
                <button
                    type="button"
                    className="_feed_inner_timeline_reaction_comment _feed_reaction"
                    onClick={() => commentInputRef.current?.focus()}
                >
                    <span className="_feed_inner_timeline_reaction_link">
                        <span>
                            <CommentReactionIcon /> Comment
                        </span>
                    </span>
                </button>
                <button type="button" className="_feed_inner_timeline_reaction_share _feed_reaction" disabled>
                    <span className="_feed_inner_timeline_reaction_link">
                        <span>
                            <ShareReactionIcon /> Share
                        </span>
                    </span>
                </button>
            </div>

            <div className="_feed_inner_timeline_cooment_area" style={{ padding: "10px 24px" }}>
                <div className="_feed_inner_comment_box">
                    <form
                        className="_feed_inner_comment_box_form"
                        onSubmit={submitComment}
                        style={{ justifyContent: "space-between", alignItems: "end" }}
                    >
                        <div className="_feed_inner_comment_box_content" style={{ alignItems: "start" }}>
                            <div className="_feed_inner_comment_box_content_image">
                                <img src={asset(user?.avatar)} alt="User" className="_comment_img" />
                            </div>
                            <div className="_feed_inner_comment_box_content_txt">
                                <AutoTextarea
                                    ref={commentInputRef}
                                    className="_comment_textarea"
                                    placeholder="Write a comment"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={handleCommentKeyDown}
                                    disabled={commentMutation.isPending}
                                />
                            </div>
                        </div>
                        <div className="_feed_inner_comment_box_icon mb-1">
                            <button type="button" className="_feed_inner_comment_box_icon_btn" disabled>
                                <CommentPhotoIcon />
                            </button>
                            <button type="button" className="_feed_inner_comment_box_icon_btn" disabled>
                                <CommentMicIcon />
                            </button>
                            <button
                                type="button"
                                className="_feed_inner_comment_box_icon_btn _submit_btn"
                                disabled={commentMutation.isPending || !commentText.trim()}
                                onClick={submitComment}
                                aria-label="Submit comment"
                            >
                                <SendPostIcon stroke="currentColor" width={16} height={16} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="timline_comment_main">
                {hiddenCount > 0 && !showAllComments ? (
                    <div className="previous_comment">
                        <button type="button" className="previous_comment_txt" onClick={() => setShowAllComments(true)}>
                            View {hiddenCount} previous comments
                        </button>
                    </div>
                ) : null}

                {visibleComments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={post.id} currentUser={user} />
                ))}
            </div>

            <ReactorsModal
                open={showReactors}
                onClose={() => setShowReactors(false)}
                postId={post.id}
                initialReacts={post.reacts}
                title="Post reactions"
            />

            <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete post?"
                message="This post and all of its comments will be permanently deleted. This cannot be undone."
                confirmLabel="Delete Post"
                cancelLabel="Cancel"
                confirmVariant="danger"
                loading={deleteMutation.isPending}
                onConfirm={confirmDeletePost}
                onCancel={() => {
                    if (deleteMutation.isPending) return;
                    setShowDeleteConfirm(false);
                }}
            />
        </div>
    );
}
