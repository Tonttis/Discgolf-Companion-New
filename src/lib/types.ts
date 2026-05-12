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
  endDate: string | null;
}

/** A parent course with its layout variants grouped together */
export interface CourseGroup {
  parent: Course;
  layouts: Course[];
  activeLayoutCount: number;
  totalLayoutCount: number;
}

// ==========================================
// View State Types
// ==========================================

export type AppView = 'home' | 'courses' | 'course-detail';
