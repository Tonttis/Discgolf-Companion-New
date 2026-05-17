// DiscGolfMetrix API integration
// Competition results from https://discgolfmetrix.com

const METRIX_API_BASE = 'https://discgolfmetrix.com/api';

interface MetrixTrack {
  TrackId: number;
  TrackName: string;
  TrackPar: number;
  Results: MetrixPlayerResult[];
}

interface MetrixPlayerResult {
  UserId: number;
  UserName: string;
  FirstName: string;
  LastName: string;
  PDGANumber: string;
  Rating: number;
  Result: number;
  Diff: number;
  Place: number;
  InHole: string; // comma-separated hole-by-hole scores
  Class: string;
}

interface MetrixSubCompetition {
  CompetitionId: number;
  Name: string;
  Status: string;
  Tracks: MetrixTrack[];
}

interface MetrixCompetitionResponse {
  Competition: {
    ID: number;
    Name: string;
    Date: string;
    Comment: string;
    CourseName: string;
    CompetitionType: number;
    Status: string;
    SubCompetitions: MetrixSubCompetition[];
  };
  Errors: string[];
}

// ==========================================
// Score utilities
// ==========================================

export function getScoreLabel(diff: number): string {
  if (diff < -10) return `${diff}`;
  if (diff === -10) return 'E';
  if (diff > 0) return `+${diff}`;
  if (diff === 0) return 'E';
  return `${diff}`;
}

export function getScoreColor(diff: number): string {
  if (diff < 0) return 'text-emerald-600 dark:text-emerald-400';
  if (diff === 0) return 'text-foreground';
  return 'text-red-600 dark:text-red-400';
}

export function getHoleScoreBg(diff: number): string {
  if (diff <= -2) return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';       // Eagle/Albatross — blue
  if (diff === -1) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';  // Birdie — green
  if (diff === 0) return 'bg-muted';                                            // Par — gray
  if (diff === 1) return 'bg-orange-500/15 text-orange-700 dark:text-orange-400';     // Bogey — orange
  if (diff >= 2) return 'bg-red-500/15 text-red-700 dark:text-red-400';              // Double Bogey+ — red
  return 'bg-muted';
}

// ==========================================
// Types used by ScorecardTable
// ==========================================

export interface Track {
  number: number;
  name: string;
  par: number;
}

export interface Player {
  scorecardId: string;
  name: string;
  place: number;
  countryCode: string;
  className: string;
  results: { result: number; diff: number }[];
  totalStrokes: number;
  totalDiff: number;
}

export interface SubCompetition {
  name: string;
  tracks: Track[];
  players: Player[];
  totalPar: number;
}

// ==========================================
// Transformed competition types
// ==========================================

export interface CompetitionTrack {
  number: number;
  name: string;
  par: number;
}

export interface CompetitionPlayer {
  name: string;
  place: number;
  result: number;
  diff: number;
  rating: number;
  class: string;
  scores: number[];
}

export interface CompetitionSubCompetition {
  id: number;
  name: string;
  players: CompetitionPlayer[];
  tracks: CompetitionTrack[];
  totalPar: number;
}

export interface Competition {
  id: number;
  name: string;
  date: string;
  comment: string;
  courseName: string;
  type: string;
  tracks: CompetitionTrack[];
  players: CompetitionPlayer[];
  totalPar: number;
  subCompetitions: CompetitionSubCompetition[];
}

// ==========================================
// API functions
// ==========================================

export async function fetchCompetitionResult(
  id: number,
  className?: string
): Promise<MetrixCompetitionResponse> {
  let url = `${METRIX_API_BASE}/result?id=${id}`;
  if (className) {
    url += `&class=${encodeURIComponent(className)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch competition: ${response.statusText}`);
  }

  return response.json();
}

function parseHoleScores(inHole: string): number[] {
  if (!inHole) return [];
  return inHole
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

function transformTracks(tracks: MetrixTrack[]): CompetitionTrack[] {
  return tracks.map((track, i) => ({
    number: i + 1,
    name: track.TrackName || `Väylä ${i + 1}`,
    par: track.TrackPar || 3,
  }));
}

function transformPlayers(
  tracks: MetrixTrack[],
  className?: string
): CompetitionPlayer[] {
  const playerMap = new Map<
    number,
    {
      name: string;
      place: number;
      result: number;
      diff: number;
      rating: number;
      class: string;
      scores: number[];
    }
  >();

  for (const track of tracks) {
    for (const r of track.Results || []) {
      if (className && r.Class && r.Class !== className) continue;

      const existing = playerMap.get(r.UserId);
      const scores = parseHoleScores(r.InHole);

      if (existing) {
        existing.result += r.Result;
        existing.diff += r.Diff;
        existing.scores = [...existing.scores, ...scores];
      } else {
        playerMap.set(r.UserId, {
          name: `${r.FirstName} ${r.LastName}`.trim() || r.UserName,
          place: r.Place,
          result: r.Result,
          diff: r.Diff,
          rating: r.Rating,
          class: r.Class,
          scores,
        });
      }
    }
  }

  return Array.from(playerMap.values()).sort((a, b) => a.place - b.place);
}

export function transformCompetition(
  raw: MetrixCompetitionResponse
): Competition {
  const comp = raw.Competition;

  const typeMap: Record<number, string> = {
    1: 'Turnaus',
    2: 'Sarja',
    3: 'Viikkokisa',
    4: 'Rataheitto',
  };

  const mainTracks: CompetitionTrack[] = [];
  const mainPlayers: CompetitionPlayer[] = [];

  const subCompetitions: CompetitionSubCompetition[] = (comp.SubCompetitions || [])
    .filter((sub) => sub.Status === 'Completed')
    .map((sub) => {
      const tracks = transformTracks(sub.Tracks);
      const players = transformPlayers(sub.Tracks);
      const totalPar = tracks.reduce((sum, t) => sum + t.par, 0);

      mainTracks.push(...tracks);
      mainPlayers.push(...players);

      return {
        id: sub.CompetitionId,
        name: sub.Name,
        players,
        tracks,
        totalPar,
      };
    });

  if (subCompetitions.length === 0 && comp.SubCompetitions?.length) {
    const allTracks = comp.SubCompetitions.flatMap((sub) => sub.Tracks);
    const tracks = transformTracks(allTracks);
    const players = transformPlayers(allTracks);
    const totalPar = tracks.reduce((sum, t) => sum + t.par, 0);

    return {
      id: comp.ID,
      name: comp.Name,
      date: comp.Date,
      comment: comp.Comment,
      courseName: comp.CourseName,
      type: typeMap[comp.CompetitionType] || 'Muu',
      tracks,
      players,
      totalPar,
      subCompetitions: [],
    };
  }

  const totalPar = mainTracks.reduce((sum, t) => sum + t.par, 0);

  return {
    id: comp.ID,
    name: comp.Name,
    date: comp.Date,
    comment: comp.Comment,
    courseName: comp.CourseName,
    type: typeMap[comp.CompetitionType] || 'Muu',
    tracks: mainTracks,
    players: mainPlayers,
    totalPar,
    subCompetitions,
  };
}
