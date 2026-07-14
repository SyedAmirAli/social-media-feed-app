/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { ArticleIcon, EventIcon, PenEditIcon, PhotoIcon, SendPostIcon, TrashIcon, VideoIcon } from "@/app/assets/icons";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { asset } from "@/config/utils";
import { useAuth } from "@/contexts/AppContext";
import { createPost, postKeys } from "@/lib/api/post";
import { PostStatus } from "@/types/enums";

export default function CreatePost() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState("");
    const [status, setStatus] = useState<PostStatus>(PostStatus.PUBLIC);
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const avatarSrc = asset(user?.avatar);

    const createMutation = useMutation({
        mutationFn: createPost,
        onSuccess: (result) => {
            if (!result.success) {
                const fieldError = result.errors ? Object.values(result.errors).flat().find(Boolean) : undefined;
                toast.error(fieldError || result.message || "Failed to create post");
                return;
            }

            setContent("");
            setStatus(PostStatus.PUBLIC);
            clearImage();
            toast.success(result.message || "Post created successfully");
            queryClient.invalidateQueries({ queryKey: postKeys.all });
        },
        onError: () => {
            toast.error("Something went wrong while creating the post");
        },
    });

    function clearImage() {
        setImage(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function handleImageChange(fileList: FileList | null) {
        const file = fileList?.[0];
        if (!file) return;

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    }

    function handleSubmit(event?: FormEvent) {
        event?.preventDefault();

        const trimmed = content.trim();
        if (!trimmed) {
            toast.error("Content is required");
            return;
        }

        createMutation.mutate({
            content: trimmed,
            status,
            image,
        });
    }

    const isSubmitting = createMutation.isPending;
    const showLabel = content.trim().length === 0;

    return (
        <div className="_feed_inner_text_area  _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
            <form onSubmit={handleSubmit}>
                <div className="_feed_inner_text_area_box">
                    <div className="_feed_inner_text_area_box_image">
                        <img src={avatarSrc} alt={user?.name || "You"} className="_txt_img _mini_avatar" />
                    </div>
                    <div className="form-floating _feed_inner_text_area_box_form ">
                        <AutoTextarea
                            className="_textarea"
                            placeholder="Leave a comment here"
                            id="floatingTextarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={5000}
                        />
                        {showLabel ? (
                            <label className="_feed_textarea_label" htmlFor="floatingTextarea">
                                Write something ... <PenEditIcon />
                            </label>
                        ) : null}
                    </div>
                </div>

                {previewUrl ? (
                    <div className="_padd_t12 _padd_b8 _create_post_preview_scroll">
                        <div className="_create_post_preview">
                            <img src={previewUrl} alt="Selected" className="_create_post_preview_img" />
                            <button
                                type="button"
                                className="_create_post_preview_remove"
                                onClick={clearImage}
                                disabled={isSubmitting}
                                aria-label="Remove image"
                            >
                                <TrashIcon width={14} height={14} />
                            </button>
                        </div>
                    </div>
                ) : null}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="d-none"
                    onChange={(e) => handleImageChange(e.target.files)}
                />

                {/*For Desktop*/}
                <div className="_feed_inner_text_area_bottom">
                    <div className="_feed_inner_text_area_item">
                        <div className="_feed_inner_text_area_bottom_photo _feed_common">
                            <button
                                type="button"
                                className="_feed_inner_text_area_bottom_photo_link"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting}
                            >
                                <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                    <PhotoIcon />
                                </span>
                                Photo
                            </button>
                        </div>
                        <div className="_feed_inner_text_area_bottom_video _feed_common">
                            <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                    <VideoIcon />
                                </span>
                                Video
                            </button>
                        </div>
                        <div className="_feed_inner_text_area_bottom_event _feed_common">
                            <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                    <EventIcon />
                                </span>
                                Event
                            </button>
                        </div>
                        <div className="_feed_inner_text_area_bottom_article _feed_common">
                            <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                    <ArticleIcon />
                                </span>
                                Article
                            </button>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 _feed_inner_text_area_btn">
                        <select
                            className="form-select form-select-sm"
                            style={{ width: "auto", minWidth: 80 }}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as PostStatus)}
                            disabled={isSubmitting}
                            aria-label="Post visibility"
                        >
                            <option value={PostStatus.PUBLIC}>Public</option>
                            <option value={PostStatus.PRIVATE}>Private</option>
                        </select>
                        <button
                            type="submit"
                            className="_feed_inner_text_area_btn_link"
                            disabled={isSubmitting || !content.trim()}
                        >
                            <SendPostIcon className="_mar_img" />
                            <span>{isSubmitting ? "Posting..." : "Post"}</span>
                        </button>
                    </div>
                </div>
                {/*For Desktop*/}

                {/*For Mobile*/}
                <div className="_feed_inner_text_area_bottom_mobile">
                    <div className="_feed_inner_text_mobile">
                        <div className="_feed_inner_text_area_item">
                            <div className="_feed_inner_text_area_bottom_photo _feed_common">
                                <button
                                    type="button"
                                    className="_feed_inner_text_area_bottom_photo_link"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSubmitting}
                                >
                                    <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                        <PhotoIcon />
                                    </span>
                                </button>
                            </div>
                            <div className="_feed_inner_text_area_bottom_video _feed_common">
                                <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                    <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                        <VideoIcon />
                                    </span>
                                </button>
                            </div>
                            <div className="_feed_inner_text_area_bottom_event _feed_common">
                                <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                    <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                        <EventIcon />
                                    </span>
                                </button>
                            </div>
                            <div className="_feed_inner_text_area_bottom_article _feed_common">
                                <button type="button" className="_feed_inner_text_area_bottom_photo_link" disabled>
                                    <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                                        <ArticleIcon />
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 _feed_inner_text_area_btn">
                            <select
                                className="form-select form-select-sm"
                                style={{ width: "auto", minWidth: 100 }}
                                value={status}
                                onChange={(e) => setStatus(e.target.value as PostStatus)}
                                disabled={isSubmitting}
                                aria-label="Post visibility"
                            >
                                <option value={PostStatus.PUBLIC}>Public</option>
                                <option value={PostStatus.PRIVATE}>Private</option>
                            </select>
                            <button
                                type="submit"
                                className="_feed_inner_text_area_btn_link"
                                disabled={isSubmitting || !content.trim()}
                            >
                                <SendPostIcon className="_mar_img" />
                                <span>{isSubmitting ? "..." : "Post"}</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/*For Mobile*/}
            </form>
        </div>
    );
}
