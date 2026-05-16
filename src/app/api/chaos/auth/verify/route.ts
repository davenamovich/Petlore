import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/chaos/auth/verify
 * Verifies a ZenMux API key by calling the Management API.
 * Requires a positive PAYG balance (> $0) OR an active paid subscription.
 */
export async function POST(request: NextRequest) {
  let apiKey: string;

  try {
    const body = await request.json();
    apiKey = body?.apiKey;
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body.' }, { status: 400 });
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return NextResponse.json(
      { valid: false, error: 'Please enter your ZenMux API key.' },
      { status: 400 }
    );
  }

  const key = apiKey.trim();

  // ── 1. Try PAYG balance ────────────────────────────────────────────────────
  let total = 0;
  let balanceOk = false;

  try {
    const balanceRes = await fetch('https://zenmux.ai/api/v1/management/payg/balance', {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[verify] PAYG balance status: ${balanceRes.status}`);

    if (balanceRes.status === 401 || balanceRes.status === 403) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired ZenMux API key. Check your key at zenmux.ai/platform/management.',
      });
    }

    if (balanceRes.ok) {
      const raw = await balanceRes.json();
      console.log(`[verify] PAYG raw:`, JSON.stringify(raw));

      // Probe every known shape ZenMux may use
      const data = raw?.data ?? raw;
      total =
        data?.total ??
        data?.balance ??
        data?.amount ??
        data?.credits ??
        raw?.total ??
        raw?.balance ??
        0;

      // ZenMux may return credits in cents — normalise values > 10000 to dollars
      if (total > 10000) total = total / 100;

      balanceOk = true;
      console.log(`[verify] resolved total: $${total}`);
    }
  } catch (e) {
    console.error('[verify] PAYG fetch error:', e);
  }

  // ── 2. If balance fetch failed, try subscription endpoint as fallback ──────
  if (!balanceOk) {
    try {
      const subRes = await fetch('https://zenmux.ai/api/v1/management/subscription/detail', {
        headers: { Authorization: `Bearer ${key}` },
      });

      console.log(`[verify] Subscription status: ${subRes.status}`);

      if (subRes.status === 401 || subRes.status === 403) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid or expired ZenMux API key. Check your key at zenmux.ai/platform/management.',
        });
      }

      if (subRes.ok) {
        // Any valid subscription = access granted regardless of PAYG
        return NextResponse.json({
          valid: true,
          balance: 0,
          message: 'Verified via subscription.',
        });
      }
    } catch (e) {
      console.error('[verify] Subscription fetch error:', e);
    }

    return NextResponse.json(
      { valid: false, error: 'Could not reach ZenMux to verify your account. Please try again.' },
      { status: 502 }
    );
  }

  // ── 3. Enforce positive balance ─────────────────────────────────────────────
  const MIN_BALANCE = 0.01;

  if (total < MIN_BALANCE) {
    return NextResponse.json({
      valid: false,
      balance: total,
      error: `Your ZenMux PAYG balance is $${total.toFixed(2)}. A positive balance (> $0) is required to unlock the scene builder. Top up at zenmux.ai/platform.`,
      signupUrl: 'https://zenmux.ai/invite/4E9SOE',
    });
  }

  return NextResponse.json({
    valid: true,
    balance: total,
    message: `Verified! $${total.toFixed(2)} credit available.`,
  });
}
