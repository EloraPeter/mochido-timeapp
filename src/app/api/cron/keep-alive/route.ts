import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// This endpoint is designed to be called by an external cron service
// (e.g. cron-job.org, EasyCron, GitHub Actions) every 3-4 days.
// It prevents the Supabase free-tier project from pausing due to inactivity
// (which happens after 7 consecutive days with no database activity).
//
// Recommended schedule: every 3 days (e.g. "0 9 */3 * *" in cron syntax)
//
// Setup options:
//   1. cron-job.org — free, point it at: https://your-domain.com/api/cron/keep-alive
//   2. GitHub Actions — add a scheduled workflow that hits this URL
//   3. Vercel Cron Jobs — add to vercel.json (requires Pro plan)
//
// Security: protect with CRON_SECRET env var so only your scheduler can call it.
// Set CRON_SECRET to any random string in both .env.local and your scheduler's headers.

export async function GET(request: Request) {
  // Optional secret check — set CRON_SECRET in your environment to enable
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Minimal read — just list storage buckets. Causes a real DB round-trip
    // without touching any user data. If Supabase Storage isn't set up yet
    // this still pings the project and resets the inactivity timer.
    const { error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('[keep-alive] Supabase ping failed:', error.message);
      return NextResponse.json(
        { ok: false, error: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    console.log('[keep-alive] Supabase ping successful at', new Date().toISOString());
    return NextResponse.json({
      ok: true,
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
