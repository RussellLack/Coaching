export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const TO = process.env.CONTACT_EMAIL ?? ''
const FROM = process.env.POSTMARK_FROM ?? ''
const TOKEN = process.env.POSTMARK_SERVER_TOKEN ?? ''

export async function POST(req: NextRequest) {
  try {
    const { name, message, context } = await req.json()

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 })
    }

    const lines = [
      context ? `Context: ${context}` : '',
      '',
      `Name: ${name}`,
      '',
      message,
      '',
      '— sent via fab.partners',
    ].filter(Boolean)

    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': TOKEN,
      },
      body: JSON.stringify({
        From: FROM,
        To: TO,
        Subject: `Strategy session enquiry — ${name}`,
        TextBody: lines.join('\n'),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Postmark error:', err)
      return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact route error', err)
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 })
  }
}
