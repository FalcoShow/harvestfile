// =============================================================================
// HarvestFile — Phase 14A: Cache Revalidation API
// app/api/revalidate/route.ts
//
// POST /api/revalidate { tag: "commodity-prices" }
// Called by Inngest crons after price data updates to bust Next.js cache.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid tag parameter' },
        { status: 400 }
      );
    }

    revalidateTag(tag);

    return NextResponse.json({
      revalidated: true,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
