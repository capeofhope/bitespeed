import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, phoneNumber } = body;

        if (!email && !phoneNumber) {
            return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400 });
        }

        // Convert phoneNumber to string
        const phoneStr = phoneNumber ? String(phoneNumber) : null;
        const emailStr = email ? String(email) : null;

        // 1. Find all matches
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
                    primaryContactId: newContact.id,
                    emails: [newContact.email].filter(Boolean),
                    phoneNumbers: [newContact.phoneNumber].filter(Boolean),
                    secondaryContactIds: [],
                },
            });
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
    } catch (error) {
        console.error('Identify API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
