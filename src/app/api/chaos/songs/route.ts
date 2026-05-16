import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const petType = searchParams.get('petType');
    const seriesType = searchParams.get('seriesType');

    const where: Record<string, unknown> = { isPublic: true };
    if (petType) where.petType = petType;
    if (seriesType) where.seriesType = seriesType;

    const songs = await db.chaosSong.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ songs });
  } catch (error: unknown) {
    console.error('[chaos/songs] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
