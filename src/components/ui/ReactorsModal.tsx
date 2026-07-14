/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { asset } from "@/config/utils";
import { listReacts, reactKeys } from "@/lib/api/react";
import type { React as ReactRecord } from "@/types";
import { ReactEmoji, ReactTitle } from "@/types/enums";

type ReactorsModalProps = {
    open: boolean;
    onClose: () => void;
    postId?: string;
    commentId?: string;
    /** Seed list from feed payload while the API loads */
    initialReacts?: ReactRecord[];
    title?: string;
};

function reactionLabel(type: string) {
    const key = type as keyof typeof ReactTitle;
    return ReactTitle[key] ?? type;
}

function reactionEmoji(type: string) {
    const key = type as keyof typeof ReactEmoji;
    return ReactEmoji[key] ?? "👍";
}

function displayName(react: ReactRecord) {
    return react.user?.name?.trim() || react.user?.email || "Unknown user";
}

export default function ReactorsModal({
    open,
    onClose,
    postId,
    commentId,
    initialReacts = [],
    title = "Reactions",
}: ReactorsModalProps) {
    const targetKey = postId
        ? reactKeys.byPost(postId)
        : commentId
          ? reactKeys.byComment(commentId)
          : (["reacts", "none"] as const);

    const { data, isLoading, isError } = useQuery({
        queryKey: targetKey,
        enabled: open && Boolean(postId || commentId),
        queryFn: async () => {
            const result = await listReacts({
                postId,
                commentId,
                limit: 100,
            });
            if (!result.success) {
                throw new Error(result.message || "Failed to load reactions");
            }
            return result.data;
        },
    });

    useEffect(() => {
        if (!open) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }

        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const seed = initialReacts.filter((react) => react.isActive);
    const reacts = (data ?? seed).filter((react) => react.isActive !== false);

    return (
        <div
            className="_reactors_modal_backdrop"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="_reactors_modal" role="dialog" aria-modal="true" aria-labelledby="reactors-modal-title">
                <div className="_reactors_modal_header">
                    <h3 id="reactors-modal-title" className="_reactors_modal_title">
                        {title}
                        {reacts.length > 0 ? ` (${reacts.length})` : ""}
                    </h3>
                    <button type="button" className="_reactors_modal_close" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                <div className="_reactors_modal_body">
                    {isLoading && reacts.length === 0 ? (
                        <p className="_reactors_modal_empty">Loading reactions...</p>
                    ) : null}

                    {isError && reacts.length === 0 ? (
                        <p className="_reactors_modal_empty">Couldn&apos;t load who reacted.</p>
                    ) : null}

                    {!isLoading && !isError && reacts.length === 0 ? (
                        <p className="_reactors_modal_empty">No reactions yet.</p>
                    ) : null}

                    {reacts.length > 0 ? (
                        <ul className="_reactors_modal_list">
                            {reacts.map((react) => (
                                <li key={react.id} className="_reactors_modal_item">
                                    <img
                                        src={asset(react.user?.avatar)}
                                        alt=""
                                        className="_reactors_modal_avatar"
                                    />
                                    <div className="_reactors_modal_meta">
                                        <span className="_reactors_modal_name">{displayName(react)}</span>
                                        <span className="_reactors_modal_type">{reactionLabel(String(react.type))}</span>
                                    </div>
                                    <span className="_reactors_modal_emoji" aria-hidden>
                                        {reactionEmoji(String(react.type))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
