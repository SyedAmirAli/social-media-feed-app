import { prisma } from "../src/lib/prisma";

async function main() {
    const userCount = await prisma.user.count();
    console.log(`✅ Connected. Users in database: ${userCount}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
