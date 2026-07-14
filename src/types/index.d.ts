import { PostStatus, React as ReactKind, ReactEmoji, ReactTitle } from "./enums";

export type User = {
    id: string;
    name: string | null;
    email: string;
    password?: string;
    createdAt: string | Date;
    updatedAt: string | Date | null;
    avatar?: string | null;
};

export type AuthUser = Omit<User, "password">;

export type AuthState = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setUser: (user: AuthUser | null) => void;
    clear: () => void;
    refetch: () => Promise<void>;
};

export type AppContextValue = {
    auth: AuthState;
    // Add other global app properties here as the project grows
};

/** API-route auth payload after JWT verification */
export type AuthCheckContext = {
    user: AuthUser;
    userId: string;
    token: string;
};

/** Author on post payloads (list/create/detail) */
export type PostAuthor = Pick<User, "id" | "name" | "email" | "avatar">;

export type React = {
    id: string;
    type: ReactKind | string;
    userId: string;
    postId?: string | null;
    commentId?: string | null;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt?: string | Date | null;
    user?: PostAuthor;
    emoji?: ReactEmoji;
    title?: ReactTitle;
};

export type Comment = {
    id: string;
    content: string;
    postId: string;
    authorId: string;
    parentCommentId?: string | null;
    repliedToId?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date | null;
    author: User | PostAuthor;
    replies?: Comment[];
    repliedTo?: User | PostAuthor | null;
    reacts?: React[];
    _count?: {
        reacts: number;
        replies: number;
    };
};

/** Canonical post shape for API + UI */
export type Post = {
    id: string;
    content: string;
    image?: string | null;
    status: PostStatus;
    authorId: string;
    createdAt: string | Date;
    updatedAt: string | Date | null;
    author: PostAuthor;
    comments?: Comment[];
    reacts?: React[];
    _count?: {
        comments: number;
        reacts: number;
    };
};

export type PostsListResponse = {
    success: boolean;
    message?: string;
    data?: Post[];
    limit?: number;
    offset?: number;
    total?: number;
};

export type FetchPostsParams = {
    limit?: number;
    offset?: number;
};

export type FetchPostsOptions = {
    /** Absolute origin for server-side calls, e.g. http://localhost:3000 */
    baseUrl?: string;
    /** Forwarded Cookie header for authenticated SSR */
    cookie?: string;
};

export type CreatePostPayload = {
    content: string;
    status?: PostStatus;
    image?: File | null;
};

export type CreatePostResponse =
    | {
          success: true;
          message: string;
          post: Post;
      }
    | {
          success: false;
          message: string;
          errors?: Record<string, string[] | undefined>;
      };

export type ReactType = keyof typeof ReactKind;
export type ReactEmojiType = keyof typeof ReactEmoji;
export type ReactTitleType = keyof typeof ReactTitle;
export type PostStatusType = keyof typeof PostStatus;
