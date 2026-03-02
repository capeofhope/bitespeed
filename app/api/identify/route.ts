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

        // other conditions
    } catch (error) {
        console.error('Identify API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
