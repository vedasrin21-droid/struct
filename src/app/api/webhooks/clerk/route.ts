import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { Webhook } from 'svix';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    // In production, CLERK_WEBHOOK_SECRET is mandatory to prevent forged user injections
    if (process.env.NODE_ENV === 'production' && !webhookSecret) {
      console.error('[Clerk Webhook Security Error] CLERK_WEBHOOK_SECRET is not configured in production.');
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
    }

    // Cryptographic Svix signature verification
    if (webhookSecret) {
      const svix_id = request.headers.get('svix-id');
      const svix_timestamp = request.headers.get('svix-timestamp');
      const svix_signature = request.headers.get('svix-signature');

      if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json(
          { error: 'Missing Svix webhook verification headers' },
          { status: 400 }
        );
      }

      const wh = new Webhook(webhookSecret);
      try {
        wh.verify(rawBody, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err: any) {
        console.warn('[Clerk Webhook Security Alert] Forged or invalid webhook signature rejected.');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 400 }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const data = event.data;

    const db = getDb();
    const now = Date.now();

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const clerkUserId = data.id;
      const primaryEmail = data.email_addresses?.[0]?.email_address || '';
      const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'STRUCT User';

      if (!clerkUserId || !primaryEmail) {
        return NextResponse.json({ error: 'Missing user identification data' }, { status: 400 });
      }

      const existing = await db.queryOne<{ id: string; role: string }>(
        'SELECT id, role FROM users WHERE clerk_user_id = $1 OR LOWER(email) = LOWER($2)',
        [clerkUserId, primaryEmail]
      );

      if (!existing) {
        const newUserId = 'usr_' + clerkUserId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 48);
        // STRICT SECURITY: Default role is strictly 'user'. Super Admin cannot be self-assigned.
        await db.execute(
          `INSERT INTO users (id, clerk_user_id, email, password_hash, salt, role, name, status, created_at)
           VALUES ($1, $2, $3, '', '', 'user', $4, 'active', $5)`,
          [newUserId, clerkUserId, primaryEmail.toLowerCase(), name, now]
        );
      } else {
        // Update profile info without modifying role
        await db.execute(
          `UPDATE users
           SET clerk_user_id = $1, name = $2
           WHERE id = $3`,
          [clerkUserId, name, existing.id]
        );
      }

      return NextResponse.json({ success: true, event: eventType });
    }

    if (eventType === 'user.deleted') {
      const clerkUserId = data.id;
      if (clerkUserId) {
        await db.execute("UPDATE users SET status = 'suspended' WHERE clerk_user_id = $1", [clerkUserId]);
      }
      return NextResponse.json({ success: true, event: eventType });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Clerk Webhook Error]', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
