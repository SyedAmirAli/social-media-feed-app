"use client";
import { Ref, TextareaHTMLAttributes, useEffect, useRef } from "react";

function autoResizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
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
            rows={1}
        />
    );
}
