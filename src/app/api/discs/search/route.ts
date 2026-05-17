import { NextRequest, NextResponse } from 'next/server';

// GET /api/discs/search?q=buzzz&brand=discraft&category=midrange&speed=5&stability=stable
// Proxies to https://discit-api.fly.dev/disc?name=buzzz&brand=discraft&category=midrange&speed=5&stability=stable
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = searchParams.get('q');
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const speed = searchParams.get('speed');
    const glide = searchParams.get('glide');
    const turn = searchParams.get('turn');
    const fade = searchParams.get('fade');
    const stability = searchParams.get('stability');

    if (!q && !brand && !category && !speed && !stability) {
      return NextResponse.json({ discs: [] });
    }

    const params = new URLSearchParams();

    if (q) {
      const slug = q.toLowerCase().replace(/\s+/g, '-');
      params.set('name', slug);
    }
    if (brand) params.set('brand', brand);
    if (category) params.set('category', category);
    if (speed) params.set('speed', speed);
    if (glide) params.set('glide', glide);
    if (turn) params.set('turn', turn);
    if (fade) params.set('fade', fade);
    if (stability) params.set('stability', stability);

    const url = `https://discit-api.fly.dev/disc?${params.toString()}`;

    const response = await fetch(url, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('DiscIt API error:', response.status, response.statusText);
      return NextResponse.json({ discs: [], error: 'Failed to search discs' }, { status: 502 });
    }

    const data = await response.json();

    const discs = Array.isArray(data) ? data.slice(0, 50) : [];

    return NextResponse.json({ discs });
  } catch (error) {
    console.error('Disc search error:', error);
    return NextResponse.json({ discs: [], error: 'Internal server error' }, { status: 500 });
  }
}
