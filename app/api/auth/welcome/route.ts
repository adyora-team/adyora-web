import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    const name = String(body.name || 'Customer').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await sendTransactionalEmail({
      toEmail: email,
      toName: name,
      templateType: 'welcome',
      variables: { customerName: name },
    });

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false });
  }
}

