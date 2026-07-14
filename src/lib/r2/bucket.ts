import {
    CopyObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
    type GetObjectCommandOutput,
    type HeadObjectCommandOutput,
    type ListObjectsV2CommandOutput,
    type PutObjectCommandInput,
    type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_ACCESS_KEY_ID, R2_BUCKET, R2_BUCKET_PREFIX, R2_ENDPOINT, R2_SECRET_ACCESS_KEY } from "@/config/dotenv";

export type PutObjectBody = PutObjectCommandInput["Body"];

export type PutObjectOptions = {
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, string>;
    contentDisposition?: string;
};

export type GetObjectResult = {
    body: GetObjectCommandOutput["Body"];
    contentType?: string;
    contentLength?: number;
    etag?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
};

export type ListObjectsOptions = {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
    delimiter?: string;
};

/**
 * Cloudflare R2 bucket manager (S3-compatible API).
 *
 * `prefix` (`R2_BUCKET_PREFIX`, e.g. `appifylab`) is a virtual directory inside the bucket.
 * Every project upload must live under that directory, for example:
 *   posts/img.png  →  appifylab/posts/img.png
 *
 * Always persist the FULL key (including prefix) in the database.
 * `putObject` / signed URL helpers return that full key as `key` for this reason.
 *
 * @author Syed Amir Ali
 * @version 1.9.1
 * @since 2026-07-14
 */
export default class Bucket {
    readonly bucket: string;
    /** Project directory inside the bucket. All uploads go under this path. */
    readonly prefix: string;
    readonly endpoint: string;
    private readonly client: S3Client;

    constructor(
        options: {
            bucket?: string;
            prefix?: string;
            endpoint?: string;
            accessKeyId?: string;
            secretAccessKey?: string;
        } = {},
    ) {
        this.bucket = options.bucket ?? R2_BUCKET;
        this.prefix = (options.prefix ?? R2_BUCKET_PREFIX).replace(/\/+$/, "");
        this.endpoint = options.endpoint ?? R2_ENDPOINT;

        const accessKeyId = options.accessKeyId ?? R2_ACCESS_KEY_ID;
        const secretAccessKey = options.secretAccessKey ?? R2_SECRET_ACCESS_KEY;

        if (!accessKeyId || !secretAccessKey) {
            throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required");
        }

        if (!this.endpoint) {
            throw new Error("R2_ENDPOINT is required");
        }

        if (!this.bucket) {
            throw new Error("R2_BUCKET is required");
        }

        this.client = new S3Client({
            region: "auto",
            endpoint: this.endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    /**
     * Build the full storage path under the project directory.
     * Example: `posts/a.png` → `appifylab/posts/a.png`
     * If the key already starts with the prefix, it is left unchanged.
     * Use this (or the `key` returned from put/signed helpers) when saving to the DB.
     */
    resolveKey(key: string): string {
        const normalized = key.replace(/^\/+/, "");
        if (!this.prefix) return normalized;
        if (normalized === this.prefix || normalized.startsWith(`${this.prefix}/`)) {
            return normalized;
        }
        return `${this.prefix}/${normalized}`;
    }

    /** Alias of `resolveKey` — full path to store in the database. */
    toStoragePath(key: string): string {
        return this.resolveKey(key);
    }

    /**
     * Upload an object under the project prefix.
     * Returns `key` as the full path (with prefix) — save that value in the DB.
     */
    async putObject(
        key: string,
        body: PutObjectBody,
        options: PutObjectOptions = {},
    ): Promise<PutObjectCommandOutput & { key: string }> {
        const objectKey = this.resolveKey(key);

        const result = await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
                Body: body,
                ContentType: options.contentType,
                CacheControl: options.cacheControl,
                Metadata: options.metadata,
                ContentDisposition: options.contentDisposition,
            }),
        );

        return { ...result, key: objectKey };
    }

    async getObject(key: string): Promise<GetObjectResult | null> {
        try {
            const result = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: this.resolveKey(key),
                }),
            );

            return {
                body: result.Body,
                contentType: result.ContentType,
                contentLength: result.ContentLength,
                etag: result.ETag,
                lastModified: result.LastModified,
                metadata: result.Metadata,
            };
        } catch (error) {
            if (Bucket.isNotFoundError(error)) return null;
            throw error;
        }
    }

    /** Read object body as a Buffer. Returns null if the object does not exist. */
    async getObjectBuffer(key: string): Promise<Buffer | null> {
        const object = await this.getObject(key);
        if (!object?.body) return null;
        return Bucket.streamToBuffer(object.body);
    }

    /** Read object body as UTF-8 text. Returns null if the object does not exist. */
    async getObjectText(key: string): Promise<string | null> {
        const buffer = await this.getObjectBuffer(key);
        return buffer ? buffer.toString("utf8") : null;
    }

    async headObject(key: string): Promise<HeadObjectCommandOutput | null> {
        try {
            return await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: this.resolveKey(key),
                }),
            );
        } catch (error) {
            if (Bucket.isNotFoundError(error)) return null;
            throw error;
        }
    }

    async objectExists(key: string): Promise<boolean> {
        const head = await this.headObject(key);
        return head !== null;
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: this.resolveKey(key),
            }),
        );
    }

    async deleteObjects(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        // S3 DeleteObjects accepts up to 1000 keys per request.
        const chunkSize = 1000;
        for (let i = 0; i < keys.length; i += chunkSize) {
            const chunk = keys.slice(i, i + chunkSize);
            await this.client.send(
                new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: chunk.map((key) => ({ Key: this.resolveKey(key) })),
                        Quiet: true,
                    },
                }),
            );
        }
    }

    async listObjects(options: ListObjectsOptions = {}): Promise<ListObjectsV2CommandOutput> {
        const prefix = options.prefix ? this.resolveKey(options.prefix) : this.prefix ? `${this.prefix}/` : undefined;

        return this.client.send(
            new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: options.maxKeys,
                ContinuationToken: options.continuationToken,
                Delimiter: options.delimiter,
            }),
        );
    }

    async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
        const from = this.resolveKey(sourceKey);
        const to = this.resolveKey(destinationKey);

        await this.client.send(
            new CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${from}`,
                Key: to,
            }),
        );
    }

    /** Presigned URL for uploading (PUT). Default expiry: 1 hour. */
    async getSignedUploadUrl(
        key: string,
        options: { expiresIn?: number; contentType?: string } = {},
    ): Promise<{ url: string; key: string }> {
        const objectKey = this.resolveKey(key);
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            ContentType: options.contentType,
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn: options.expiresIn ?? 3600,
        });

        return { url, key: objectKey };
    }

    /** Presigned URL for downloading (GET). Default expiry: 1 hour. */
    async getSignedDownloadUrl(
        key: string,
        options: { expiresIn?: number } = {},
    ): Promise<{ url: string; key: string }> {
        const objectKey = this.resolveKey(key);
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn: options.expiresIn ?? 3600,
        });

        return { url, key: objectKey };
    }

    static extensionFromMime(mime: string): string {
        const map: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/svg+xml": "svg",
            "image/avif": "avif",
            "image/heic": "heic",
            "image/heif": "heif",
        };
        return map[mime] ?? "bin";
    }

    static async uploadImage(file: File, userId: string, prefix: string): Promise<string> {
        const bucket = new this();
        const ext = this.extensionFromMime(file.type);
        const key = `${prefix}/${userId}/${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const uploaded = await bucket.putObject(key, buffer, {
            contentType: file.type || "application/octet-stream",
        });

        // Full key including bucket prefix — save this in DB
        return uploaded.key;
    }

    static isNotFoundError(error: unknown): boolean {
        if (!error || typeof error !== "object") return false;
        const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
        return err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404;
    }

    static async streamToBuffer(body: NonNullable<GetObjectCommandOutput["Body"]>): Promise<Buffer> {
        if (Buffer.isBuffer(body)) return body;
        if (body instanceof Uint8Array) return Buffer.from(body);

        // Node.js Readable / SDK helpers
        if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
            const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
            return Buffer.from(bytes);
        }

        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}
