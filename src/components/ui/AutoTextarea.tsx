"use client";

import { Ref, TextareaHTMLAttributes, useEffect, useRef } from "react";

const DEFAULT_MAX_HEIGHT = 160;

function readMaxHeight(el: HTMLTextAreaElement) {
    const raw = getComputedStyle(el).maxHeight;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_HEIGHT;
}

function autoResizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;

    // main.css sets height with !important on ._comment_textarea / create-post
    // textareas, so we must set inline height with !important as well.
    el.style.setProperty("height", "auto", "important");
    const next = Math.min(el.scrollHeight, readMaxHeight(el));
    el.style.setProperty("height", `${next}px`, "important");
}

type AutoTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "ref"> & {
    ref?: Ref<HTMLTextAreaElement>;
};

export default function AutoTextarea({ className, value, onChange, ref, ...props }: AutoTextareaProps) {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        autoResizeTextarea(localRef.current);
    }, [value]);

    return (
        <textarea
            {...props}
            ref={(node) => {
                localRef.current = node;
                if (typeof ref === "function") {
                    ref(node);
                } else if (ref) {
                    ref.current = node;
                }
                autoResizeTextarea(node);
            }}
            value={value}
            className={["form-control", "_textarea_auto", className ?? "_comment_textarea"].filter(Boolean).join(" ")}
            onChange={(event) => {
                autoResizeTextarea(event.currentTarget);
                onChange?.(event);
            }}
            onInput={(event) => {
                autoResizeTextarea(event.currentTarget);
                props.onInput?.(event);
            }}
            rows={1}
        />
    );
}
