import {
  MetrixCourse,
  CoursesListResponse,
  CompetitionResponse,
  Course,
  Track,
  PlayerResult,
  Player,
  Competition,
  SubCompetition,
} from './types';

const BASE_URL = 'https://discgolfmetrix.com/api.php';

// ==========================================
// Raw API calls
// ==========================================

export async function fetchCoursesList(
  countryCode: string,
  nameSearch?: string
): Promise<MetrixCourse[]> {
  const params = new URLSearchParams({
    content: 'courses_list',
    country_code: countryCode,
  });

  if (nameSearch) {
    params.set('name', `${nameSearch}%`);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }

  const data: CoursesListResponse = await response.json();
  return data.courses ?? [];
}

export async function fetchCompetitionResult(
  competitionId: number,
  className?: string
): Promise<CompetitionResponse> {
  const params = new URLSearchParams({
    content: 'result',
    id: competitionId.toString(),
  });

  if (className) {
    params.set('class', className);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url, { next: { revalidate: 600 } });

  if (!response.ok) {
    throw new Error(`Failed to fetch competition: ${response.status}`);
  }

  return response.json();
}

// ==========================================
// Data transformers (raw → app types)
// ==========================================

export function transformCourse(raw: MetrixCourse): Course {
  return {
    id: raw.ID,
    parentId: raw.ParentID,
    name: raw.Name,
    shortName: raw.Short,
    fullName: raw.Fullname,
    type: raw.Type === '1' ? 'parent' : 'layout',
    countryCode: raw.CountryCode,
    area: raw.Area,
    city: raw.City,
    location: raw.Location,
    latitude: parseFloat(raw.X) || 0,
    longitude: parseFloat(raw.Y) || 0,
    isActive: !raw.Enddate,
  };
}

export function transformTrack(raw: { Number: string; NumberAlt: string; Par: string }): Track {
  return {
    number: parseInt(raw.Number, 10),
    numberAlt: raw.NumberAlt,
    par: parseInt(raw.Par, 10),
  };
}

export function transformPlayerResult(raw: {
  Result: string;
  Diff: number;
  BUE: string;
  GRH: string;
  OCP: string;
  ICP: string;
  IBP: string;
  PEN: string;
}): PlayerResult {
  return {
    result: parseInt(raw.Result, 10) || 0,
    diff: raw.Diff,
    bue: raw.BUE === '1',
    grh: raw.GRH === '1',
    ocp: raw.OCP === '1',
    icp: raw.ICP === '1',
    ibp: raw.IBP === '1',
    penalty: parseInt(raw.PEN, 10) || 0,
  };
}

export function transformPlayer(raw: {
  UserID: string;
  ScorecardID: string;
  Name: string;
  ClassName: string;
  CountryCode: string;
  Group: string;
  Sum: number;
  Diff: number;
  DNF: string | null;
  Place: number;
  OrderNumber: number;
  PlayerResults: Array<{
    Result: string;
    Diff: number;
    BUE: string;
    GRH: string;
    OCP: string;
    ICP: string;
    IBP: string;
    PEN: string;
  }>;
}): Player {
  return {
    userId: raw.UserID,
    scorecardId: raw.ScorecardID,
    name: raw.Name,
    className: raw.ClassName,
    countryCode: raw.CountryCode,
    group: raw.Group,
    totalStrokes: raw.Sum,
    totalDiff: raw.Diff,
    dnf: raw.DNF !== null,
    place: raw.Place,
    orderNumber: raw.OrderNumber,
    results: raw.PlayerResults.map(transformPlayerResult),
  };
}

export function transformCompetition(raw: CompetitionResponse): Competition {
  const comp = raw.Competition;
  const tracks = comp.Tracks.map(transformTrack);
  const totalPar = tracks.reduce((sum, t) => sum + t.par, 0);
  const players = comp.Results.map(transformPlayer);
  const subCompetitions: SubCompetition[] = (comp.SubCompetitions ?? []).map((sub) => {
    const subTracks = sub.Tracks.map(transformTrack);
    return {
      id: sub.ID,
      name: sub.Name,
      tracks: subTracks,
      players: sub.Results.map(transformPlayer),
      totalPar: subTracks.reduce((sum, t) => sum + t.par, 0),
    };
  });

  return {
    id: comp.ID,
    name: comp.Name,
    type: comp.Type,
    date: comp.Date,
    time: comp.Time,
    comment: comp.Comment,
    courseName: comp.CourseName,
    courseId: comp.CourseID,
    tracks,
    players,
    subCompetitions,
    totalPar,
  };
}

// ==========================================
// Helper: extract unique filter values from courses
// ==========================================

export function extractUniqueValues(
  courses: Course[]
): {
  countries: string[];
  areas: string[];
  cities: string[];
} {
  const countrySet = new Set<string>();
  const areaSet = new Set<string>();
  const citySet = new Set<string>();

  for (const course of courses) {
    if (course.countryCode) countrySet.add(course.countryCode);
    if (course.area) areaSet.add(course.area);
    if (course.city) citySet.add(course.city);
  }

  return {
    countries: Array.from(countrySet).sort(),
    areas: Array.from(areaSet).sort(),
    cities: Array.from(citySet).sort(),
  };
}

// Score relative to par label
export function getScoreLabel(diff: number): string {
  if (diff < -2) return `${diff}`;
  if (diff === -2) return '-2';
  if (diff === -1) return '-1';
  if (diff === 0) return 'E';
  return `+${diff}`;
}

export function getScoreColor(diff: number): string {
  if (diff < -1) return 'text-emerald-600 dark:text-emerald-400';
  if (diff === -1) return 'text-green-600 dark:text-green-400';
  if (diff === 0) return 'text-foreground';
  if (diff === 1) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getHoleScoreBg(diff: number): string {
  if (diff <= -2) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (diff === -1) return 'bg-green-500/15 text-green-700 dark:text-green-400';
  if (diff === 0) return 'bg-muted text-foreground';
  if (diff === 1) return 'bg-orange-500/15 text-orange-700 dark:text-orange-400';
  return 'bg-red-500/15 text-red-700 dark:text-red-400';
}
