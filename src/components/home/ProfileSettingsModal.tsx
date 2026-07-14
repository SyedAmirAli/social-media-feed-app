/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { asset } from "@/config/utils";
import { useAuth } from "@/contexts/AppContext";
import { updateProfile } from "@/lib/api/auth";
import { postKeys } from "@/lib/api/post";
import type { AuthUser } from "@/types";

type ProfileSettingsModalProps = {
    open: boolean;
    onClose: () => void;
    user: AuthUser | null;
};

export default function ProfileSettingsModal({ open, onClose, user }: ProfileSettingsModalProps) {
    const { setUser } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user?.name ?? "");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? "");
        setAvatarFile(null);
        setRemoveAvatar(false);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [open, user?.name, user?.avatar]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const currentAvatarSrc = removeAvatar ? asset(null) : previewUrl ? previewUrl : asset(user?.avatar);

    const updateMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (result) => {
            if (!result.success) {
                const fieldError = result.errors ? Object.values(result.errors).flat().find(Boolean) : undefined;
                toast.error(fieldError || result.message || "Failed to update profile");
                return;
            }

            setUser(result.user);
            queryClient.invalidateQueries({ queryKey: postKeys.all });
            toast.success(result.message || "Profile updated successfully");
            onClose();
        },
        onError: () => toast.error("Failed to update profile"),
    });

    function handleAvatarChange(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setAvatarFile(file);
        setRemoveAvatar(false);
        setPreviewUrl(URL.createObjectURL(file));
    }

    function handleRemoveAvatar() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setAvatarFile(null);
        setRemoveAvatar(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("Name is required");
            return;
        }

        const nameChanged = trimmed !== (user?.name ?? "").trim();
        if (!nameChanged && !avatarFile && !removeAvatar) {
            toast.error("Nothing to update");
            return;
        }

        updateMutation.mutate({
            name: trimmed,
            avatar: avatarFile,
            removeAvatar: removeAvatar && !avatarFile,
        });
    }

    if (!open) return null;

    return (
        <div className="_profile_settings_modal_backdrop" role="presentation" onClick={onClose}>
            <div
                className="_profile_settings_modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="_profile_settings_title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="_profile_settings_modal_header">
                    <h3 id="_profile_settings_title" className="_profile_settings_modal_title">
                        Settings
                    </h3>
                    <button
                        type="button"
                        className="_profile_settings_modal_close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="_profile_settings_modal_body">
                    <div className="_profile_settings_avatar_wrap">
                        <img src={currentAvatarSrc} alt="Avatar preview" className="_profile_settings_avatar" />
                        <div className="_profile_settings_avatar_actions">
                            <button
                                type="button"
                                className="_btn1"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={updateMutation.isPending}
                                style={{ padding: "8px 32px", width: "100%" }}
                            >
                                Change photo
                            </button>
                            {(user?.avatar || previewUrl) && !removeAvatar ? (
                                <button
                                    type="button"
                                    className="btn btn-link text-danger p-0"
                                    onClick={handleRemoveAvatar}
                                    disabled={updateMutation.isPending}
                                >
                                    Remove
                                </button>
                            ) : null}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                            className="d-none"
                            onChange={(e) => handleAvatarChange(e.target.files)}
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="_profile_settings_name" className="form-label">
                            Name
                        </label>
                        <input
                            id="_profile_settings_name"
                            type="text"
                            className="form-control _inpt1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            disabled={updateMutation.isPending}
                            required
                            style={{ padding: "8px 12px", borderRadius: "8px" }}
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control _inpt1"
                            value={user?.email ?? ""}
                            disabled
                            readOnly
                            style={{ padding: "8px 12px", borderRadius: "8px" }}
                        />
                    </div>

                    <div className="_profile_settings_modal_footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={onClose}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="_btn1"
                            style={{ width: "100%", padding: "8px" }}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
