"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { React as ReactKind } from "@/types/enums";
import { reactionEmoji, reactionLabel, REACTION_OPTIONS } from "./reaction-utils";

type ReactionPickerProps = {
    activeType?: ReactKind | string | null;
    disabled?: boolean;
    variant?: "post" | "comment";
    onToggle: () => void;
    onPick: (type: ReactKind) => void;
    children: ReactNode;
    className?: string;
};

export default function ReactionPicker({
    activeType,
    disabled,
    variant = "post",
    onToggle,
    onPick,
    children,
    className,
}: ReactionPickerProps) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearCloseTimer() {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }

    function handleEnter() {
        clearCloseTimer();
        setOpen(true);
    }

    function handleLeave() {
        clearCloseTimer();
        closeTimer.current = setTimeout(() => setOpen(false), 180);
    }

    useEffect(() => {
        return () => clearCloseTimer();
    }, []);

    return (
        <div
            className={`_reaction_picker ${variant === "comment" ? "_reaction_picker_comment" : ""} ${className ?? ""}`}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            <div className={`_reaction_picker_tray${open ? " _reaction_picker_tray_open" : ""}`} role="listbox">
                {REACTION_OPTIONS.map((type) => (
                    <button
                        key={type}
                        type="button"
                        className={`_reaction_picker_emoji${activeType === type ? " _reaction_picker_emoji_active" : ""}`}
                        title={reactionLabel(type)}
                        aria-label={reactionLabel(type)}
                        disabled={disabled}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onPick(type);
                            setOpen(false);
                        }}
                    >
                        <span aria-hidden>{reactionEmoji(type)}</span>
                    </button>
                ))}
            </div>
            <button
                type="button"
                className={
                    variant === "post"
                        ? `_feed_inner_timeline_reaction_emoji _feed_reaction${activeType ? " _feed_reaction_active" : ""}`
                        : "_reaction_picker_trigger_comment border-0 bg-transparent p-0"
                }
                onClick={onToggle}
                disabled={disabled}
            >
                {children}
            </button>
        </div>
    );
}
