export const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

export const DATABASE_URL =
    process.env["DATABASE_URL"] ||
    "postgres://2c33cf8b03b7c956a09da0fcd2ae5ba6594bc836dd595d4fa09bbb3baebd6fdd:sk_VCzSfL_v_o1uUNGu8ytut@db.prisma.io:5432/postgres?sslmode=require";

export const PRISMA_API_KEY = process.env["PRISMA_API_KEY"];

export const R2_TOKEN_VALUE = process.env["R2_TOKEN_VALUE"] || "cfat_KoppyyLQXEJtAO0sjxYdguRxKD5bdxt6rxHBVZVX7653f74d";

export const R2_ACCESS_KEY_ID = process.env["R2_ACCESS_KEY_ID"] || "6cc9d69b758c9f17ca7f356b2d760a72";

export const R2_SECRET_ACCESS_KEY = process.env["R2_SECRET_ACCESS_KEY"];

export const R2_ENDPOINT =
    process.env["R2_ENDPOINT"] || "https://1a2718ed7d6ce9394379a7e3415a1eda.r2.cloudflarestorage.com";

export const R2_BUCKET = process.env["R2_BUCKET"] || "temporary";

export const R2_BUCKET_PREFIX = process.env["R2_BUCKET_PREFIX"] || "appifylab";

export const ASSETS_BASE_URL = process.env["ASSETS_BASE_URL"] || "https://temporary.syedamirali.me";

// JWT Credentials
export const JWT_SECRET = process.env["JWT_SECRET"];

export const JWT_EXPIRATION = process.env["JWT_EXPIRATION"] || "30d";
