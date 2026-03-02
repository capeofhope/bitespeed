import { POST } from './app/api/identify/route';
import { prisma } from './app/lib/prisma';

async function mockPost(body: unknown) {
    const req = {
        json: async () => body
    } as unknown as Request;
    const res = await POST(req);
    return res.json();
}

async function run() {
    console.log("Cleaning DB...");
    await prisma.contact.deleteMany({});

    console.log("\n--- Case 1: Initial creation ---");
    let res = await mockPost({ email: 'lorraine@hillvalley.edu', phoneNumber: '123456' });
    console.log(JSON.stringify(res, null, 2));

    console.log("\n--- Case 2: Create secondary (matches phone) ---");
    res = await mockPost({ email: 'mcfly@hillvalley.edu', phoneNumber: '123456' });
    console.log(JSON.stringify(res, null, 2));

    console.log("\n--- Case 3: Create secondary (matches email) ---");
    res = await mockPost({ email: 'lorraine@hillvalley.edu', phoneNumber: '789101' });
    console.log(JSON.stringify(res, null, 2));

    console.log("\n--- Case 4: No new info (should return same) ---");
    res = await mockPost({ email: 'mcfly@hillvalley.edu', phoneNumber: '123456' });
    console.log(JSON.stringify(res, null, 2));

    console.log("\n--- Case 5: Independent primary ---");
    res = await mockPost({ email: 'biff@hillvalley.edu', phoneNumber: '777777' });
    console.log(JSON.stringify(res, null, 2));

    console.log("\n--- Case 6: Merge two primaries ---");
    res = await mockPost({ email: 'biff@hillvalley.edu', phoneNumber: '123456' });
    console.log(JSON.stringify(res, null, 2));

}

run().catch(console.error).finally(() => prisma.$disconnect());
