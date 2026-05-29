import { NextRequest, NextResponse } from 'next/server';
import * as postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN ?? '');
const TO = process.env.CONTACT_EMAIL ?? 'russell@fab.partners';
const FROM = process.env.POSTMARK_FROM ?? 'noreply@fab.partners';

export async function POST(req: NextRequest) {
  try {
    const { name, message, context } = await req.json();

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 });
    }

    const lines = [
      context ? `Context: ${context}` : '',
      '',
      `Name: ${name}`,
      '',
      message,
      '',
      '— sent via fab.partners',
    ].filter((l): l is string => l !== undefined);

    await client.sendEmail({
      From: FROM,
      To: TO,
      Subject: `Strategy session enquiry — ${name}`,
      TextBody: lines.join('\n'),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('contact route error', err);
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 });
  }
}
