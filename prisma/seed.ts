import "dotenv/config";
import Hash from "../src/lib/hash";
import { prisma } from "../src/lib/prisma";
import { PostStatus, ReactType, type Post } from "./generated/client";

/** Shared password for every seeded account (use this to log in locally). */
const DEFAULT_PASSWORD = "password123";

type SeedPost = {
    content: string;
    status: PostStatus;
};

type SeedUser = {
    email: string;
    name: string;
    posts: SeedPost[];
};

const SEED_USERS: SeedUser[] = [
    {
        email: "alice@example.com",
        name: "Alice",
        posts: [
            {
                content: "Hello World — welcome to the feed!",
                status: PostStatus.PUBLIC,
            },
            {
                content: "Getting started with Prisma and Next.js.",
                status: PostStatus.PUBLIC,
            },
        ],
    },
    {
        email: "bob@example.com",
        name: "Bob",
        posts: [
            {
                content: "Bob's first draft — a work in progress.",
                status: PostStatus.PRIVATE,
            },
        ],
    },
    {
        email: "cara@example.com",
        name: "Cara",
        posts: [],
    },
];

async function upsertUser(email: string, name: string, password: string) {
    return prisma.user.upsert({
        where: { email },
        update: { name, password },
        create: { email, name, password },
    });
}

async function seedPostsForUser(authorId: string, posts: SeedPost[]): Promise<Post[]> {
    if (posts.length === 0) return [];

    const existing = await prisma.post.count({ where: { authorId } });
    if (existing > 0) return [];

    return Promise.all(
        posts.map((post) =>
            prisma.post.create({
                data: {
                    content: post.content,
                    status: post.status,
                    authorId,
                },
            }),
        ),
    );
}

async function seedInteractions(
    aliceId: string,
    bobId: string,
    caraId: string,
    alicePublicPostId?: string,
) {
    if (!alicePublicPostId) return;

    const existingComments = await prisma.comment.count({
        where: { postId: alicePublicPostId },
    });
    if (existingComments > 0) return;

    const comment = await prisma.comment.create({
        data: {
            content: "Nice post, Alice!",
            postId: alicePublicPostId,
            authorId: bobId,
        },
    });

    await prisma.comment.create({
        data: {
            content: "@Bob thanks! Glad you liked it.",
            postId: alicePublicPostId,
            authorId: aliceId,
            parentCommentId: comment.id,
            repliedToId: bobId,
        },
    });

    await prisma.react.createMany({
        data: [
            {
                postId: alicePublicPostId,
                userId: bobId,
                type: ReactType.LIKE,
                isActive: true,
            },
            {
                postId: alicePublicPostId,
                userId: caraId,
                type: ReactType.LOVE,
                isActive: true,
            },
            {
                commentId: comment.id,
                userId: aliceId,
                type: ReactType.HAHA,
                isActive: true,
            },
        ],
    });
}

async function seed() {
    const password = await Hash.create(DEFAULT_PASSWORD);

    const results = [];
    for (const entry of SEED_USERS) {
        const user = await upsertUser(entry.email, entry.name, password);
        const createdPosts = await seedPostsForUser(user.id, entry.posts);
        results.push({ user, createdPosts });
    }

    const [alice, bob, cara] = results;

    const alicePublicPost =
        alice.createdPosts.find((post) => post.status === PostStatus.PUBLIC) ??
        (await prisma.post.findFirst({
            where: { authorId: alice.user.id, status: PostStatus.PUBLIC },
            orderBy: { createdAt: "asc" },
        }));

    await seedInteractions(alice.user.id, bob.user.id, cara.user.id, alicePublicPost?.id);

    console.log("Seed complete.");
    console.log(`Default password for all seed users: ${DEFAULT_PASSWORD}`);
    console.table(
        results.map(({ user }) => ({
            id: user.id,
            name: user.name,
            email: user.email,
        })),
    );
}

async function main() {
    try {
        await seed();
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
