// ==========================================
// DiscGolfMetrix API Type Definitions
// ==========================================

// --- Courses List API ---

export interface MetrixCourse {
  ID: string;
  ParentID: string;
  Name: string;
  Short: string;
  Fullname: string;
  Type: string; // "1" = Parent course, "2" = Specific layout/standalone
  CountryCode: string;
  Area: string;
  City: string;
  Location: string;
  X: string; // Latitude
  Y: string; // Longitude
  Enddate: string;
}

export interface CoursesListResponse {
  courses: MetrixCourse[];
}

// --- Competition Result API ---

export interface MetrixTrack {
  Number: string;
  NumberAlt: string;
  Par: string;
}

export interface MetrixPlayerResult {
  Result: string; // Strokes on this hole
  Diff: number; // Strokes relative to par
  BUE: string; // Bogey/under-eagle
  GRH: string; // Green in regulation hit
  OCP: string; // Outside circle putt
  ICP: string; // Inside circle putt
  IBP: string; // Inside band putt
  PEN: string; // Penalty strokes
}

export interface MetrixPlayer {
  UserID: string;
  ScorecardID: string;
  Name: string;
  ClassName: string;
  CountryCode: string;
  Group: string;
  Sum: number; // Total strokes
  Diff: number; // Total score relative to par
  DNF: string | null;
  BUETotal: string;
  GRHTotal: string;
  OCPTotal: string;
  ICPTotal: string;
  IBPTotal: string;
  PenaltiesTotal: string;
  PreviousRoundsSum: number | null;
  PreviousRoundsDiff: number | null;
  Place: number;
  OrderNumber: number;
  PlayerResults: MetrixPlayerResult[];
}

export interface MetrixCompetition {
  ID: number;
  Name: string;
  Type: string;
  TourDateStart: string;
  TourDateEnd: string;
  Date: string;
  Time: string;
  Comment: string;
  CourseName: string;
  CourseID: string;
  MetrixMode: string;
  ShowPreviousRoundsSum: string | null;
  HasSubcompetitions: number;
  WeeklyHC: unknown[];
  Results: MetrixPlayer[];
  Tracks: MetrixTrack[];
  SubCompetitions: MetrixSubCompetition[];
}

export interface MetrixSubCompetition {
  ID: number;
  Name: string;
  Results: MetrixPlayer[];
  Tracks: MetrixTrack[];
}

export interface CompetitionResponse {
  Competition: MetrixCompetition;
  Errors: string[];
}

// ==========================================
// App-level Types (frontend-friendly)
// ==========================================

export interface Course {
  id: string;
  parentId: string;
  name: string;
  shortName: string;
  fullName: string;
  type: 'parent' | 'layout';
  countryCode: string;
  area: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface Track {
  number: number;
  numberAlt: string;
  par: number;
}

export interface PlayerResult {
  result: number;
  diff: number;
  bue: boolean;
  grh: boolean;
  ocp: boolean;
  icp: boolean;
  ibp: boolean;
  penalty: number;
}

export interface Player {
  userId: string;
  scorecardId: string;
  name: string;
  className: string;
  countryCode: string;
  group: string;
  totalStrokes: number;
  totalDiff: number;
  dnf: boolean;
  place: number;
  orderNumber: number;
  results: PlayerResult[];
}

export interface Competition {
  id: number;
  name: string;
  type: string;
  date: string;
  time: string;
  comment: string;
  courseName: string;
  courseId: string;
  tracks: Track[];
  players: Player[];
  subCompetitions: SubCompetition[];
  totalPar: number;
}

export interface SubCompetition {
  id: number;
  name: string;
  tracks: Track[];
  players: Player[];
  totalPar: number;
}

// ==========================================
// View State Types
// ==========================================

export type AppView = 'home' | 'courses' | 'course-detail' | 'competition';

export interface AppState {
  currentView: AppView;
  selectedCourseId: string | null;
  selectedCompetitionId: number | null;
  searchQuery: string;
  selectedCountry: string;
  selectedArea: string;
  selectedCity: string;
}
