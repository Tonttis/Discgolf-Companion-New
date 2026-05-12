// ==========================================
// Frisbeegolfradat.fi Course Types
// ==========================================

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

export type AppView = 'home' | 'courses' | 'course-detail';

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
