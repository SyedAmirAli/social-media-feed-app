import { ASSETS_BASE_URL, R2_BUCKET_PREFIX } from "@/config/dotenv";

/** Global skeleton placeholder when an asset path is missing or invalid */
export const ASSET_FALLBACK = "/assets/images/fallback-skeleton.svg";

export interface AssetOptions {
    prefix?: string;
    baseUrl?: string;
}

export function asset(path?: string | null, options?: AssetOptions): string {
    const { prefix = R2_BUCKET_PREFIX, baseUrl = ASSETS_BASE_URL } = options || {};

    if (!path || typeof path !== "string") {
        return ASSET_FALLBACK;
    }

    // Already an absolute URL
    if (/^https?:\/\//i.test(path)) return path;

    // Remove leading and trailing slashes
    const clean = (str: string) => String(str).replace(/^\/+|\/+$/g, "");

    const cleanBase = String(baseUrl).replace(/\/+$/g, "");
    const cleanPrefix = clean(prefix);
    const cleanPath = clean(path);

    // Prevent duplicate prefix
    if (cleanPrefix && (cleanPath === cleanPrefix || cleanPath.startsWith(cleanPrefix + "/"))) {
        return `${cleanBase}/${cleanPath}`;
    }

    return cleanPrefix ? `${cleanBase}/${cleanPrefix}/${cleanPath}` : `${cleanBase}/${cleanPath}`;
}
