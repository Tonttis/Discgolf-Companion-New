// ==========================================
// Frisbeegolfradat.fi Course Types
// ==========================================

export interface Hole {
  id: number;
  courseId: number;
  holeNumber: number;
  name: string;
  length: number | null;
  par: number | null;
  note: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
}

export interface Course {
  id: number;
  slug: string;
  name: string;
  city: string;
  holes: number;
  rating: number | null;
  classification: string;
  isTop: boolean;
  isNew: boolean;
  mapUrl: string | null;

  // Detail fields (may be null until detail page is scraped)
  address: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  founded: string | null;
  basketType: string | null;
  teeType: string | null;
  terrain: string | null;
  signage: string | null;
  courseType: string | null;
  maintenance: string | null;
  courseMaster: string | null;
  designer: string | null;
  isFree: string | null;
  moreInfo: string | null;
  winterPlay: string | null;
  description: string | null;
  descriptionFull: string | null;
  scorecardUrl: string | null;
  ratingCount: number | null;
  detailFetchedAt: string | null;

  // Banner/cover photo and logo
  bannerImageUrl: string | null;
  logoUrl: string | null;

  // Hole-by-hole details (from Väyläkuvaukset section)
  holeDetails?: Hole[];

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface CoursesListResponse {
  courses: Course[];
  filters: {
    cities: string[];
    classifications: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SyncResponse {
  status: 'cached' | 'synced';
  totalCourses?: number;
  lastUpdated?: string;
  added?: number;
  updated?: number;
  total?: number;
  message: string;
}

// ==========================================
// View State Types
// ==========================================

export type AppView =
  | 'home'
  | 'courses'
  | 'course-detail'
  | 'auth'
  | 'profile'
  | 'new-game'
  | 'active-game'
  | 'game-summary'
  | 'game-history'
  | 'game-detail'
  | 'favorites'
  | 'competition';

// ==========================================
// Auth & User Types
// ==========================================

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  supabaseConfigured: boolean;
}

// ==========================================
// Game Types
// ==========================================

export type GameStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Game {
  id: string;
  courseSlug: string;
  courseName: string;
  totalHoles: number;
  totalPar: number;
  createdBy: string;
  status: GameStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  players: GamePlayer[];
  scores: Score[];
}

export interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  displayName: string | null;
  joinedAt: string;
}

export interface Score {
  id: string;
  gameId: string;
  playerId: string;
  holeNumber: number;
  throws: number;
  par: number | null;
}

export interface PlayerScoreSummary {
  playerId: string;
  userId: string;
  username: string;
  displayName: string | null;
  totalThrows: number;
  totalPar: number;
  diffFromPar: number;
  holeScores: { holeNumber: number; throws: number; par: number | null; diff: number }[];
}

// ==========================================
// Favorites Types
// ==========================================

export interface Favorite {
  id: string;
  userId: string;
  courseSlug: string;
  createdAt: string;
}

// ==========================================
// Classification Labels
// ==========================================

export const CLASSIFICATION_LABELS: Record<string, string> = {
  'aaa1': 'AAA1 — Elite',
  'aa1': 'AA1 — Excellent',
  'a1': 'A1 — Very Good',
  'bbb1': 'BBB1 — Good',
  'bb1': 'BB1 — Above Average',
  'b1': 'B1 — Average',
  'ccc1': 'CCC1 — Below Average',
  'cc1': 'CC1 — Fair',
  'c1': 'C1 — Basic',
};

export function getClassificationLabel(code: string): string {
  return CLASSIFICATION_LABELS[code] || code.toUpperCase();
}

export function getClassificationColor(code: string): string {
  if (code.startsWith('aaa')) return 'text-emerald-600 dark:text-emerald-400';
  if (code.startsWith('aa')) return 'text-green-600 dark:text-green-400';
  if (code.startsWith('a')) return 'text-lime-600 dark:text-lime-400';
  if (code.startsWith('bbb')) return 'text-yellow-600 dark:text-yellow-400';
  if (code.startsWith('bb')) return 'text-amber-600 dark:text-amber-400';
  if (code.startsWith('b')) return 'text-orange-600 dark:text-orange-400';
  return 'text-muted-foreground';
}

export function getClassificationBg(code: string): string {
  if (code.startsWith('aaa')) return 'bg-emerald-500/15';
  if (code.startsWith('aa')) return 'bg-green-500/15';
  if (code.startsWith('a')) return 'bg-lime-500/15';
  if (code.startsWith('bbb')) return 'bg-yellow-500/15';
  if (code.startsWith('bb')) return 'bg-amber-500/15';
  if (code.startsWith('b')) return 'bg-orange-500/15';
  return 'bg-muted';
}

// Score naming helpers
export function getScoreName(throws: number, par: number | null): string {
  if (!par) return '';
  const diff = throws - par;
  if (throws === 1) return 'Ace!';
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  if (diff === 3) return 'Triple Bogey';
  return `+${diff}`;
}

export function getScoreColor(throws: number, par: number | null): string {
  if (!par) return '';
  const diff = throws - par;
  if (throws === 1) return 'text-purple-600 dark:text-purple-400';
  if (diff <= -2) return 'text-emerald-600 dark:text-emerald-400';
  if (diff === -1) return 'text-green-600 dark:text-green-400';
  if (diff === 0) return 'text-foreground';
  if (diff === 1) return 'text-orange-600 dark:text-orange-400';
  if (diff === 2) return 'text-red-600 dark:text-red-400';
  return 'text-red-700 dark:text-red-400';
}

export function getScoreBg(throws: number, par: number | null): string {
  if (!par) return '';
  const diff = throws - par;
  if (throws === 1) return 'bg-purple-500/15';
  if (diff <= -2) return 'bg-emerald-500/15';
  if (diff === -1) return 'bg-green-500/15';
  if (diff === 0) return '';
  if (diff === 1) return 'bg-orange-500/15';
  if (diff === 2) return 'bg-red-500/15';
  return 'bg-red-500/20';
}
