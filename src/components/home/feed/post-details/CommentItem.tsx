/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, Fragment, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { formatDistanceToNowStrict } from "date-fns";
import { CommentMicIcon, CommentPhotoIcon, HeartIcon, SendPostIcon, ThumbsUpIcon } from "@/app/assets/icons";
import AutoTextarea from "@/components/ui/AutoTextarea";
import ReactorsModal from "@/components/ui/ReactorsModal";
import { asset } from "@/config/utils";
import { createComment } from "@/lib/api/comment";
import { postKeys } from "@/lib/api/post";
import {
    optimisticAddReply,
    optimisticToggleCommentReact,
    reconcileCommentReact,
    replaceTempComment,
    restorePostsCache,
    type PostsCacheSnapshot,
} from "@/lib/api/post-cache";
import { reactKeys, upsertReact } from "@/lib/api/react";
import type { AuthUser, Comment } from "@/types";
import { React as ReactKind } from "@/types/enums";
import CommentContent from "./CommentContent";
import ReactionPicker from "./ReactionPicker";
import { authorLabel, reactionLabel, uniqueReactTypes } from "./reaction-utils";

type CommentItemProps = {
    comment: Comment;
    postId: string;
    currentUser: AuthUser | null;
};

export default function CommentItem({ comment, postId, currentUser }: CommentItemProps) {
    const queryClient = useQueryClient();
    const replyInputRef = useRef<HTMLTextAreaElement>(null);
    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReactors, setShowReactors] = useState(false);

    const mentionName = authorLabel(comment.author);
    const mentionTag = `@${mentionName}`;
    const isNested = Boolean(comment.parentCommentId);
    const currentUserId = currentUser?.id;
    const currentUserAvatar = currentUser?.avatar;

    const likeMutation = useMutation({
        mutationFn: (type: ReactKind) => upsertReact({ commentId: comment.id, type }),
        onMutate: async (type) => {
            if (!currentUser) return { snapshots: [] as PostsCacheSnapshot };
            await queryClient.cancelQueries({ queryKey: postKeys.all });
            const snapshots = optimisticToggleCommentReact(queryClient, postId, comment.id, currentUser, type);
            return { snapshots };
        },
        onSuccess: (result, _type, context) => {
            if (!result.success) {
                if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
                toast.error(result.message || "Failed to react");
                return;
            }
            if (currentUser) {
                reconcileCommentReact(queryClient, postId, comment.id, currentUser.id, result);
            }
        },
        onError: (_error, _type, context) => {
            if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
            toast.error("Failed to react");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: reactKeys.byComment(comment.id) });
        },
    });

    const replyMutation = useMutation({
        mutationFn: createComment,
        onMutate: async (payload) => {
            if (!currentUser) return { snapshots: [] as PostsCacheSnapshot, tempId: "", content: payload.content };
            await queryClient.cancelQueries({ queryKey: postKeys.all });
            const tempId = `temp-comment-${Date.now()}`;
            const parentCommentId = payload.parentCommentId ?? comment.id;
            const snapshots = optimisticAddReply(queryClient, postId, currentUser, {
                content: payload.content,
                parentCommentId,
                repliedToId: payload.repliedToId ?? comment.authorId,
                repliedTo: comment.author,
                tempId,
            });
            setReplyText("");
            setShowReply(false);
            return { snapshots, tempId, content: payload.content };
        },
        onSuccess: (result, _payload, context) => {
            if (!result.success) {
                if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
                if (context?.content) {
                    setReplyText(context.content);
                    setShowReply(true);
                }
                toast.error(result.message || "Failed to reply");
                return;
            }
            if (context?.tempId) {
                replaceTempComment(queryClient, postId, context.tempId, result.comment);
            }
        },
        onError: (_error, _payload, context) => {
            if (context?.snapshots) restorePostsCache(queryClient, context.snapshots);
            if (context?.content) {
                setReplyText(context.content);
                setShowReply(true);
            }
            toast.error("Failed to reply");
        },
    });

    const myReact = comment.reacts?.find((r) => r.userId === currentUserId && r.isActive);
    const reactCount = comment._count?.reacts ?? comment.reacts?.filter((r) => r.isActive).length ?? 0;
    const reactTypes = uniqueReactTypes(comment.reacts);

    function openReply() {
        setShowReply(true);
        setReplyText((prev) => {
            const trimmed = prev.trim();
            if (!trimmed) return `${mentionTag} `;
            if (trimmed.startsWith(mentionTag)) return prev.startsWith(mentionTag) ? prev : `${mentionTag} ${trimmed}`;
            return `${mentionTag} ${trimmed}`;
        });
    }

    useEffect(() => {
        if (!showReply) return;
        const el = replyInputRef.current;
        if (!el) return;
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
    }, [showReply]);

    function closeReply() {
        setShowReply(false);
        setReplyText("");
    }

    function submitReply(event: FormEvent) {
        event.preventDefault();
        const content = replyText.trim();
        const withoutMention = content.startsWith(mentionTag) ? content.slice(mentionTag.length).trim() : content;

        if (!withoutMention) {
            toast.error("Reply is required");
            return;
        }

        replyMutation.mutate({
            postId,
            content,
            parentCommentId: comment.parentCommentId ?? comment.id,
            repliedToId: comment.authorId,
        });
    }

    function handleReplyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeReply();
            return;
        }
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        if (replyMutation.isPending) return;
        submitReply(event as unknown as FormEvent);
    }

    return (
        <Fragment>
            <div
                className={`_timline_comment_main${isNested ? " _timline_comment_nested" : ""}`}
                style={{ padding: "0 24px" }}
            >
                <div className="_comment_main">
                    <div className="_comment_image">
                        <span className="_comment_image_link">
                            <img src={asset(comment.author?.avatar)} alt={mentionName} className="_mini_avatar" />
                        </span>
                    </div>
                    <div className="_comment_area">
                        <div className="_comment_details">
                            <div className="_comment_details_top">
                                <div className="_comment_name">
                                    <h4 className="_comment_name_title">{mentionName}</h4>
                                    {comment.repliedTo ? (
                                        <span className="_comment_reply_to">
                                            {" "}
                                            replied to <strong>{authorLabel(comment.repliedTo)}</strong>
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="_comment_status">
                                <p className="_comment_status_text">
                                    <CommentContent content={comment.content} repliedTo={comment.repliedTo} />
                                </p>
                            </div>
                            {reactCount > 0 ? (
                                <div className="_total_reactions">
                                    <button
                                        type="button"
                                        className="_comment_reactors_btn"
                                        onClick={() => setShowReactors(true)}
                                        aria-label={`Show who reacted (${reactCount})`}
                                    >
                                        <div className="_total_react">
                                            {(reactTypes.length ? reactTypes : ["LIKE"]).slice(0, 2).map((type) => (
                                                <span
                                                    key={type}
                                                    className={
                                                        type === ReactKind.LOVE || type === ReactKind.CARE
                                                            ? "_reaction_heart"
                                                            : "_reaction_like"
                                                    }
                                                >
                                                    {type === ReactKind.LOVE || type === ReactKind.CARE ? (
                                                        <HeartIcon />
                                                    ) : (
                                                        <ThumbsUpIcon />
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="_total">{reactCount}</span>
                                    </button>
                                </div>
                            ) : null}
                            <div className="_comment_reply">
                                <div className="_comment_reply_num">
                                    <ul className="_comment_reply_list">
                                        <li>
                                            <ReactionPicker
                                                variant="comment"
                                                activeType={myReact?.type}
                                                disabled={likeMutation.isPending}
                                                onToggle={() =>
                                                    likeMutation.mutate((myReact?.type as ReactKind) || ReactKind.LIKE)
                                                }
                                                onPick={(type) => likeMutation.mutate(type)}
                                            >
                                                <span style={{ fontWeight: myReact ? 600 : 400 }}>
                                                    {myReact ? reactionLabel(String(myReact.type)) : "Like"}
                                                    {" \u2022"}
                                                </span>
                                            </ReactionPicker>
                                        </li>
                                        <li>
                                            <button
                                                type="button"
                                                className="border-0 bg-transparent p-0"
                                                onClick={() => (showReply ? closeReply() : openReply())}
                                            >
                                                <span>Reply{" \u2022"}</span>
                                            </button>
                                        </li>
                                        <li>
                                            <span>Share{" \u2022"}</span>
                                        </li>
                                        <li>
                                            <span className="_time_link">
                                                {formatDistanceToNowStrict(comment.createdAt, { addSuffix: true })}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {showReply ? (
                            <div className="_feed_inner_comment_box _comment_reply_box">
                                <form
                                    className="_feed_inner_comment_box_form"
                                    onSubmit={submitReply}
                                    style={{ justifyContent: "space-between", alignItems: "end" }}
                                >
                                    <div className="_feed_inner_comment_box_content" style={{ alignItems: "start" }}>
                                        <div className="_feed_inner_comment_box_content_image">
                                            <img src={asset(currentUserAvatar)} alt="" className="_comment_img" />
                                        </div>
                                        <div className="_feed_inner_comment_box_content_txt">
                                            <AutoTextarea
                                                ref={replyInputRef}
                                                className="_comment_textarea"
                                                placeholder={`Reply to ${mentionName}`}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyDown={handleReplyKeyDown}
                                                disabled={replyMutation.isPending}
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
                                            disabled={
                                                replyMutation.isPending ||
                                                !(replyText.trim().startsWith(mentionTag)
                                                    ? replyText.trim().slice(mentionTag.length).trim()
                                                    : replyText.trim())
                                            }
                                            onClick={submitReply}
                                            aria-label="Send reply"
                                        >
                                            <SendPostIcon stroke="currentColor" width={16} height={16} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {comment.replies?.map((reply) => (
                <CommentItem key={reply.id} comment={reply} postId={postId} currentUser={currentUser} />
            ))}

            <ReactorsModal
                open={showReactors}
                onClose={() => setShowReactors(false)}
                commentId={comment.id}
                initialReacts={comment.reacts}
                title={isNested ? "Reply reactions" : "Comment reactions"}
            />
        </Fragment>
    );
}
