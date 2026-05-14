import { NextRequest, NextResponse } from 'next/server';
import { fetchCompetitionResult, transformCompetition } from '@/lib/metrix-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      );
    }

    const className = searchParams.get('class') || undefined;
    const rawResponse = await fetchCompetitionResult(parseInt(id, 10), className);

    if (rawResponse.Errors && rawResponse.Errors.length > 0) {
      return NextResponse.json(
        { error: rawResponse.Errors.join(', ') },
        { status: 400 }
      );
    }

    const competition = transformCompetition(rawResponse);

    return NextResponse.json(competition);
  } catch (error) {
    console.error('Error fetching competition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition results' },
      { status: 500 }
    );
  }
}
