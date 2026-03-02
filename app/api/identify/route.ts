import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
        }

        const { email, phoneNumber } = body || {};

        if (!email && !phoneNumber) {
            return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400, headers: corsHeaders });
        }

        // Convert phoneNumber to string
        const phoneStr = phoneNumber ? String(phoneNumber) : null;
        const emailStr = email ? String(email) : null;

        // 1. Find all direct matches
        const matches = await prisma.contact.findMany({
            where: {
                OR: [
                    ...(emailStr ? [{ email: emailStr }] : []),
                    ...(phoneStr ? [{ phoneNumber: phoneStr }] : []),
                ],
            },
        });

        if (matches.length === 0) {
            // Create new primary
            const newContact = await prisma.contact.create({
                data: {
                    email: emailStr,
                    phoneNumber: phoneStr,
                    linkPrecedence: 'primary',
                },
            });

            return NextResponse.json({
                contact: {
                    primaryContatctId: newContact.id,
                    emails: [newContact.email].filter(Boolean),
                    phoneNumbers: [newContact.phoneNumber].filter(Boolean),
                    secondaryContactIds: [],
                },
            }, { headers: corsHeaders });
        }

        // 2. We have matches. Find all related contacts in the "cluster"
        const primaryIds = new Set(
            matches.map((c) => (c.linkPrecedence === 'primary' ? c.id : c.linkedId)).filter(Boolean) as number[]
        );

        // Fetch all contacts in these clusters
        const allClusterContacts = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: { in: Array.from(primaryIds) } },
                    { linkedId: { in: Array.from(primaryIds) } },
                ],
            },
            orderBy: { createdAt: 'asc' },
        });

        // 3. Identify the oldest primary contact
        const primaryContacts = allClusterContacts.filter(c => c.linkPrecedence === 'primary');
        primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const oldestPrimary = primaryContacts[0] || allClusterContacts.find(c => c.id === primaryIds.values().next().value) || allClusterContacts[0];

        // 4. Update other primary contacts to secondary and re-link their secondaries
        const primariesToDemote = primaryContacts.slice(1);
        const idsToUpdateToSecondary: number[] = [];

        for (const p of primariesToDemote) {
            idsToUpdateToSecondary.push(p.id);
        }

        if (idsToUpdateToSecondary.length > 0) {
            await prisma.contact.updateMany({
                where: {
                    OR: [
                        { id: { in: idsToUpdateToSecondary } },
                        { linkedId: { in: idsToUpdateToSecondary } }
                    ]
                },
                data: {
                    linkedId: oldestPrimary.id,
                    linkPrecedence: 'secondary',
                },
            });

            // Update our local array to avoid re-fetching
            for (const c of allClusterContacts) {
                if (idsToUpdateToSecondary.includes(c.id) || idsToUpdateToSecondary.includes(c.linkedId as number)) {
                    c.linkedId = oldestPrimary.id;
                    c.linkPrecedence = 'secondary';
                }
            }
        }

        // 5. Check if we need to add a new secondary
        const existingEmails = new Set(allClusterContacts.map(c => c.email).filter(Boolean));
        const existingPhones = new Set(allClusterContacts.map(c => c.phoneNumber).filter(Boolean));

        const isNewEmail = emailStr && !existingEmails.has(emailStr);
        const isNewPhone = phoneStr && !existingPhones.has(phoneStr);

        if (isNewEmail || isNewPhone) {
            const newSecondary = await prisma.contact.create({
                data: {
                    email: emailStr,
                    phoneNumber: phoneStr,
                    linkedId: oldestPrimary.id,
                    linkPrecedence: 'secondary',
                },
            });
            allClusterContacts.push(newSecondary);
        }

        // Sort to keep oldest first
        allClusterContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const finalCluster = allClusterContacts.filter(c => c.id === oldestPrimary.id || c.linkedId === oldestPrimary.id);

        const emails = Array.from(new Set([
            oldestPrimary.email,
            ...finalCluster.map(c => c.email)
        ].filter(Boolean)));

        const phoneNumbers = Array.from(new Set([
            oldestPrimary.phoneNumber,
            ...finalCluster.map(c => c.phoneNumber)
        ].filter(Boolean)));

        const secondaryContactIds = finalCluster
            .filter(c => c.id !== oldestPrimary.id)
            .map(c => c.id);

        return NextResponse.json({
            contact: {
                primaryContatctId: oldestPrimary.id,
                emails,
                phoneNumbers,
                secondaryContactIds,
            }
        }, { headers: corsHeaders });

    } catch (error: unknown) {
        console.error('Identify API Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500, headers: corsHeaders });
    }
}
