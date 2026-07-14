"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: "danger" | "primary";
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title = "Are you sure?",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant = "danger",
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !loading) onCancel();
        }

        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, loading, onCancel]);

    if (!open) return null;

    return (
        <div
            className="_confirm_dialog_backdrop"
            role="presentation"
            onClick={(event) => {
                if (loading) return;
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                className="_confirm_dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                <div className="_confirm_dialog_header">
                    <h3 id="confirm-dialog-title" className="_confirm_dialog_title">
                        {title}
                    </h3>
                    <button
                        type="button"
                        className="_confirm_dialog_close"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="_confirm_dialog_body">
                    <p id="confirm-dialog-message" className="_confirm_dialog_message">
                        {message}
                    </p>
                    <div className="_confirm_dialog_actions">
                        <button
                            type="button"
                            className="_confirm_dialog_btn _confirm_dialog_btn_cancel"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            className={`_confirm_dialog_btn _confirm_dialog_btn_${confirmVariant}`}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? "Please wait..." : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
